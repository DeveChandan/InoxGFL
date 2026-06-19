import { Request, Response } from 'express';
import { s4hanaRequest } from '../services/s4hana';

interface AuthRequest extends Request {
  user?: any;
}

const parseSAPDate = (dateField: string) => {
  if (!dateField) return new Date(0);
  if (dateField.includes('Date(')) {
    return new Date(parseInt(dateField.match(/\d+/)?.[0] || '0', 10));
  }
  return new Date(dateField);
};

export const getProp = (obj: any, target: string) => {
  if (!obj) return undefined;
  const key = Object.keys(obj).find(k => k.toLowerCase().replace(/_/g, '') === target.toLowerCase().replace(/_/g, ''));
  return key ? obj[key] : undefined;
};

const getEmailFilter = (email: string) => {
  const cleanEmail = (email || '').trim();
  const lower = cleanEmail.toLowerCase();
  const upper = cleanEmail.toUpperCase();
  const parts = cleanEmail.split('@');
  let capitalized = cleanEmail;
  if (parts.length === 2) {
    capitalized = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase() + '@' + parts[1].toLowerCase();
  }
  const casings = Array.from(new Set([cleanEmail, lower, upper, capitalized]));
  return '(' + casings.map(c => `Email eq '${c}'`).join(' or ') + ')';
};

export const getMISReport = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    const userEmail = req.user?.email || '';
    const userRole = req.user?.role || 'EMPLOYEE';
    const userVendorCode = req.user?.vendor_code || '';
    
    // 1. Extract Query Params
    const { startDate, endDate, emp_name, vendor_code, approval_status, page = '1', limit = '50', fetchAll = 'false' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // 2. Resolve User Filters (Needed for searching by name, or for VENDOR_ADMIN / SUPER_ADMIN to map vendor employees)
    let preFilterEmails: string[] | null = null;
    let needsPreFilter = false;
    let usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$top=5000`;
    let userFilters: string[] = [];

    if (emp_name || userRole === 'VENDOR_ADMIN' || (userRole === 'SUPER_ADMIN' && vendor_code)) {
      needsPreFilter = true;
      if (emp_name) {
        userFilters.push(`substringof('${emp_name}', Name)`);
      }
      
      if (userRole === 'VENDOR_ADMIN') {
        if (userVendorCode) {
          userFilters.push(`Vendorcode eq '${userVendorCode.toUpperCase()}'`);
        } else {
          userFilters.push(`Email eq '${userEmail}'`);
        }
      } else if (userRole === 'SUPER_ADMIN' && vendor_code) {
        userFilters.push(`Vendorcode eq '${(vendor_code as string).toUpperCase()}'`);
      }
    }

    if (needsPreFilter) {
      if (userFilters.length > 0) {
        usersQuery += `&$filter=${userFilters.join(' and ')}`;
      }
      
      let usersRes;
      try {
        usersRes = await s4hanaRequest('GET', usersQuery, undefined, undefined, jwtToken);
      } catch(e: any) {
        console.warn(`[getMISReport] Filtered users query failed (${usersQuery}):`, e.message, '. Retrying without filter...');
        try {
          usersRes = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$top=5000', undefined, undefined, jwtToken);
        } catch (fallbackErr: any) {
          console.error('[getMISReport] Fallback users query failed:', fallbackErr.message);
          usersRes = { d: { results: [] } };
        }
      }
      
      let users = usersRes.d?.results || usersRes.d || [];
      if (!Array.isArray(users)) users = [users];

      // Node.js Level Security fallback for emp_name search
      if (emp_name) {
        const searchName = (emp_name as string).toLowerCase();
        users = users.filter((u: any) => (getProp(u, 'name') || '').toLowerCase().includes(searchName));
      }
      
      const isGlobalAdmin = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN');
      if (!isGlobalAdmin && userVendorCode) {
        users = users.filter((u: any) => (getProp(u, 'vendorcode') || '').toUpperCase() === userVendorCode.toUpperCase() || (getProp(u, 'email') || '').toLowerCase() === userEmail.toLowerCase());
      } else if (userRole === 'SUPER_ADMIN' && vendor_code) {
        users = users.filter((u: any) => (getProp(u, 'vendorcode') || '').toUpperCase() === (vendor_code as string).toUpperCase());
      } else if (userRole === 'EMPLOYEE') {
        users = users.filter((u: any) => (getProp(u, 'email') || '').toLowerCase() === userEmail.toLowerCase());
      }

      preFilterEmails = users.map((u: any) => getProp(u, 'email')).filter(Boolean);
      if (!isGlobalAdmin && userVendorCode) {
        preFilterEmails.push(userEmail);
      }
      preFilterEmails = Array.from(new Set(preFilterEmails));
      
      if (preFilterEmails && preFilterEmails.length === 0) {
        return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
      }
    }

    // 3. Construct Attendance OData Query (Fetch all matching records in date range, grouping/slicing done in Node.js)
    let attFilters: string[] = [];
    if (startDate) attFilters.push(`Timestamp ge '${startDate}'`);
    if (endDate) attFilters.push(`Timestamp le '${endDate}'`);

    // Inject pre-filtered emails if applicable
    if (preFilterEmails && preFilterEmails.length > 0) {
      if (preFilterEmails.length <= 80) {
        const emailConditions = preFilterEmails.map(email => `Email eq '${email}'`).join(' or ');
        attFilters.push(`(${emailConditions})`);
      }
    } else if (!preFilterEmails) {
      const isGlobalAdmin = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN');
      if (userRole === 'EMPLOYEE') {
        attFilters.push(getEmailFilter(userEmail));
      } else if (!isGlobalAdmin && userVendorCode) {
        attFilters.push(`(Vendorcode eq '${userVendorCode.toUpperCase()}' or ${getEmailFilter(userEmail)})`);
      } else if (userRole === 'SUPER_ADMIN' && vendor_code) {
        attFilters.push(`Vendorcode eq '${(vendor_code as string).toUpperCase()}'`);
      }
    }

    let attQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet`;
    if (attFilters.length > 0) {
      attQuery += `?$filter=${attFilters.join(' and ')}`;
    }
    attQuery += `${attFilters.length > 0 ? '&' : '?'}$top=20000`; // Fetch larger subset
    attQuery += `&$orderby=Timestamp desc`;

    let attRes;
    try {
      attRes = await s4hanaRequest('GET', attQuery, undefined, undefined, jwtToken);
    } catch (e: any) {
      if (e.message && e.message.includes('orderby')) {
        attQuery = attQuery.replace(`&$orderby=Timestamp desc`, '');
        attRes = await s4hanaRequest('GET', attQuery, undefined, undefined, jwtToken);
      } else {
        throw e;
      }
    }

    let attendance = attRes.d?.results || attRes.d || [];
    if (!Array.isArray(attendance)) attendance = [attendance];

    if (attendance.length === 0) {
      return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
    }

    // Filter Node.js side if URL was too long or just as a security backup
    if (preFilterEmails) {
      const emailSet = new Set(preFilterEmails.map(e => e.toLowerCase()));
      attendance = attendance.filter((a: any) => {
        const aEmail = (a.Email || a.email || '').toLowerCase();
        return emailSet.has(aEmail);
      });
    }

    // 4. Group Attendance (IN/OUT pairs)
    const attMap: Record<string, any> = {};
    attendance.forEach((a: any) => {
      const aEmail = a.Email || a.email;
      const aDate = a.Timestamp || a.timestamp;
      if (!aEmail || !aDate) return;
      
      const key = `${aDate}_${aEmail.toLowerCase()}`;
      const currApp = a.Currentapprover || getProp(a, 'currentapprover') || '';
      if (!attMap[key]) {
        attMap[key] = {
          id: a.Eventid || a.id || a.event_id,
          work_date: aDate,
          email: aEmail,
          status: a.Type === 'OUT' ? 'completed' : 'working',
          overall_approval_status: 'PENDING',
          is_exception: a.Isexception === 'X',
          hours_worked: getProp(a, 'hoursworked') || '0',
          ip_address: a.Ipaddress || a.ip_address,
          os_system: a.Ossystem || a.os_system,
          readable_location: a.Readablelocation || a.readable_location,
          hidden_location: a.Hiddenloaction || a.Hiddenlocation || a.hidden_location,
          manual_location: a.Manuallocation || a.manual_location,
          current_approver: currApp,
          vendor_code: a.Vendorcode || getProp(a, 'vendorcode') || '',
          IN: null,
          OUT: null
        };
      }
      if (a.Type === 'IN') attMap[key].IN = a;
      if (a.Type === 'OUT') {
        attMap[key].OUT = a;
        const hrs = getProp(a, 'hoursworked');
        if (hrs) {
          attMap[key].hours_worked = hrs;
        }
      }
      if (currApp && !attMap[key].current_approver) {
        attMap[key].current_approver = currApp;
      }
      
      // Update overall approval status if the event has APPROVED, REJECTED, or PENDING.
      const currentStatus = (a.Status || '').toUpperCase();
      if (currentStatus === 'APPROVED' || currentStatus === 'REJECTED' || currentStatus === 'PENDING') {
        attMap[key].overall_approval_status = currentStatus;
      }
    });

    let groupedData = Object.values(attMap);

    // 5. Filter by Approval Status
    if (approval_status && approval_status !== 'ALL') {
      const filterStatus = (approval_status as string).toUpperCase();
      groupedData = groupedData.filter((rec: any) => rec.overall_approval_status === filterStatus);
    }

    // 6. Sort Chronologically (Descending: newest dates at the top)
    const normalizeDate = (dStr: string) => {
      if (!dStr) return 0;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return new Date(dStr).getTime();
      if (/^\d{8}$/.test(dStr)) {
        const y = dStr.substring(0, 4);
        const m = dStr.substring(4, 6);
        const d = dStr.substring(6, 8);
        return new Date(`${y}-${m}-${d}`).getTime();
      }
      return new Date(dStr).getTime() || 0;
    };
    groupedData.sort((a: any, b: any) => normalizeDate(b.work_date) - normalizeDate(a.work_date));

    // 7. Slicing for Pagination
    const totalCount = groupedData.length;
    let paginatedData = groupedData;
    if (fetchAll !== 'true') {
      const startIndex = (pageNum - 1) * limitNum;
      paginatedData = groupedData.slice(startIndex, startIndex + limitNum);
    }

    // 8. JIT Fetching: Fetch employee and approver names/vendor details ONLY for the active page
    const uniqueEmails = Array.from(new Set([
      ...paginatedData.map((a: any) => a.email.toLowerCase()),
      ...paginatedData.map((a: any) => {
        const appEmail = a.current_approver || '';
        if (appEmail.includes(':')) {
          return appEmail.split(':')[1].toLowerCase();
        }
        return appEmail.toLowerCase();
      })
    ].filter(Boolean)));
    const userMap: Record<string, any> = {};
    const vendorMap: Record<string, any> = {};
    const vendorCodesToFetch = new Set<string>();

    // Collect vendor codes from paginated data directly as a fallback
    paginatedData.forEach((rec: any) => {
      const vCode = (rec.vendor_code || '').toString().trim().toUpperCase();
      if (vCode) {
        vendorCodesToFetch.add(vCode);
      }
    });

    if (uniqueEmails.length > 0) {
      const emailChunks = [];
      for (let i = 0; i < uniqueEmails.length; i += 20) {
        emailChunks.push(uniqueEmails.slice(i, i + 20));
      }

      for (const chunk of emailChunks) {
        const emailFilters = chunk.map(e => getEmailFilter(e)).join(' or ');
        const usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=${emailFilters}`;
        
        try {
          const uRes = await s4hanaRequest('GET', usersQuery, undefined, undefined, jwtToken);
          let uData = uRes.d?.results || uRes.d || [];
          if (!Array.isArray(uData)) uData = [uData];
          
          uData.forEach((u: any) => {
            const uEmail = getProp(u, 'email');
            if (uEmail) {
              const uVendorCode = (getProp(u, 'vendorcode') || '').toString().trim().toUpperCase();
              if (uVendorCode) vendorCodesToFetch.add(uVendorCode);
              
              userMap[uEmail.toLowerCase()] = {
                email: uEmail,
                name: getProp(u, 'name') || uEmail,
                vendor_code: uVendorCode
              };
            }
          });
        } catch (err) {
          console.warn("Failed to fetch specific users chunk", err);
        }
      }
    }

    const vCodes = Array.from(vendorCodesToFetch);
    if (vCodes.length > 0) {
      const vFilters = vCodes.map(v => `Vendorcode eq '${v}'`).join(' or ');
      const vQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$filter=${vFilters}`;
      try {
        const vRes = await s4hanaRequest('GET', vQuery, undefined, undefined, jwtToken);
        let vData = vRes.d?.results || vRes.d || [];
        if (!Array.isArray(vData)) vData = [vData];
        
        vData.forEach((v: any) => {
          const vCode = (v.Vendorcode || v.vendor_code || '').toString().trim().toUpperCase();
          if (vCode) {
            vendorMap[vCode] = {
               vendor_code: vCode,
               vendor_name: v.Vendorname || v.vendor_name || vCode
            };
          }
        });
      } catch (err) {
        console.warn("Failed to fetch vendors", err);
      }
    }

    // 9. Fetch Worksheets for ONLY the active page
    const wsMap: Record<string, any> = {};
    if (paginatedData.length > 0) {
      let wsFilters: string[] = [];
      if (startDate) wsFilters.push(`Workdate ge datetime'${startDate}T00:00:00'`);
      if (endDate) wsFilters.push(`Workdate le datetime'${endDate}T23:59:59'`);
      
      if (!preFilterEmails) {
        if (userRole === 'EMPLOYEE') {
          wsFilters.push(getEmailFilter(userEmail));
        } else if (userRole === 'VENDOR_ADMIN') {
          if (userVendorCode) {
             wsFilters.push(`(Vendorcode eq '${userVendorCode.toUpperCase()}' or ${getEmailFilter(userEmail)})`);
          } else {
             wsFilters.push(getEmailFilter(userEmail));
          }
        } else if (userRole === 'SUPER_ADMIN' && vendor_code) {
          wsFilters.push(`Vendorcode eq '${(vendor_code as string).toUpperCase()}'`);
        }
      } else if (preFilterEmails.length <= 80) {
        const emailConditions = preFilterEmails.map(email => `Email eq '${email}'`).join(' or ');
        wsFilters.push(`(${emailConditions})`);
      }
      
      let wsQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet`;
      if (wsFilters.length > 0) {
        wsQuery += `?$filter=${wsFilters.join(' and ')}`;
      }
      
      try {
        const wsRes = await s4hanaRequest('GET', wsQuery, undefined, undefined, jwtToken);
        let worksheets = wsRes.d?.results || wsRes.d || [];
        if (!Array.isArray(worksheets)) worksheets = [worksheets];
        
        worksheets.forEach((w: any) => {
          const wEmail = getProp(w, 'email');
          const wDate = parseSAPDate(getProp(w, 'workdate') || w.date).toISOString().split('T')[0];
          if (wEmail) {
            wsMap[`${wDate}_${wEmail.toLowerCase()}`] = w;
          }
        });
      } catch (wsErr) {
        console.warn("Could not fetch worksheets optimally", wsErr);
      }
    }

    // 10. Format and construct the Final Mapped Data
    const formatTimeForUI = (dateStr: string, timeStr: string) => {
      if (!timeStr) return dateStr;
      let hours = "00", mins = "00", secs = "00";
      const match = timeStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (match) {
        if (match[1]) hours = match[1].replace('H', '').padStart(2, '0');
        if (match[2]) mins = match[2].replace('M', '').padStart(2, '0');
        if (match[3]) secs = match[3].replace('S', '').padStart(2, '0');
      }
      return `${dateStr}T${hours}:${mins}:${secs}`;
    };

    const finalReportData = paginatedData.map((rec: any) => {
      const uInfo = userMap[rec.email.toLowerCase()] || { email: rec.email, name: rec.email, vendor_code: rec.vendor_code || '' };
      const lookupCode = (uInfo.vendor_code || '').toString().trim().toUpperCase();
      const vInfo = lookupCode ? vendorMap[lookupCode] : null;
      
      const wsInfo = wsMap[`${rec.work_date}_${rec.email.toLowerCase()}`];
      
      let clock_in_time = null;
      let clock_out_time = null;
      if (rec.IN) clock_in_time = formatTimeForUI(rec.work_date, rec.IN.Worktime);
      if (rec.OUT) clock_out_time = formatTimeForUI(rec.work_date, rec.OUT.Worktime);
      
      if (rec.IN && rec.OUT) {
        rec.status = 'completed';
      } else if (rec.IN) {
        rec.status = 'working';
      } else if (rec.OUT) {
        rec.status = 'completed';
      } else {
        rec.status = 'working';
      }
      
      let approval_steps: any[] = [];
      if (rec.overall_approval_status === 'PENDING' && rec.current_approver) {
        const parts = rec.current_approver.split(':');
        if (parts.length === 2 && parts[0].startsWith('L')) {
          const levelStr = parts[0].substring(1);
          const levelNum = parseInt(levelStr, 10);
          const approverEmail = parts[1];
          const approverUser = userMap[approverEmail.toLowerCase()] || { email: approverEmail, name: approverEmail };
          approval_steps = [{
            level: levelNum,
            approver: {
              email: approverEmail,
              name: approverUser.name
            }
          }];
        } else {
          const approverEmail = rec.current_approver;
          const approverUser = userMap[approverEmail.toLowerCase()] || { email: approverEmail, name: approverEmail };
          approval_steps = [{
            level: 1,
            approver: {
              email: approverEmail,
              name: approverUser.name
            }
          }];
        }
      }

      return {
        ...rec,
        user: {
          ...uInfo,
          vendor: vInfo
        },
        worksheet: wsInfo ? { tasks_description: getProp(wsInfo, 'taskdescription') || getProp(wsInfo, 'tasks_description') || '' } : null,
        clock_in_time,
        clock_out_time,
        approval_steps
      };
    });

    res.json({ 
      message: 'Success', 
      data: finalReportData, 
      totalCount, 
      page: pageNum, 
      limit: limitNum 
    });
  } catch (error: any) {
    console.error('getMISReport Error:', error);
    res.status(500).json({ message: 'Error generating MIS report', error: error.message });
  }
};

export const getOverviewStats = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    const userEmail = req.user?.email || '';
    const userRole = req.user?.role || 'EMPLOYEE';
    const userVendorCode = req.user?.vendor_code || '';

    // Calculate past dates in Asia/Kolkata timezone
    const formatterDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const todayStr = formatterDate.format(new Date());

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const startDateStr = formatterDate.format(pastDate);

    // Generate date array for 7-day trend
    const dateArray: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateArray.push(formatterDate.format(d));
    }

    const isGlobalAdmin = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN');

    if (isGlobalAdmin) {
      // 1. Fetch Vendors
      let vendors: any[] = [];
      try {
        const vRes = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$top=1000', undefined, undefined, jwtToken);
        vendors = vRes.d?.results || vRes.d || [];
        if (!Array.isArray(vendors)) vendors = [vendors];
      } catch (err) {
        console.warn('Failed to fetch vendors for overview:', err);
      }

      // 2. Fetch Users
      let users: any[] = [];
      try {
        const uRes = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$top=5000', undefined, undefined, jwtToken);
        users = uRes.d?.results || uRes.d || [];
        if (!Array.isArray(users)) users = [users];
      } catch (err) {
        console.warn('Failed to fetch users for overview:', err);
      }

      // 3. Fetch Attendance
      let attendance: any[] = [];
      try {
        const attRes = await s4hanaRequest(
          'GET', 
          `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=Timestamp ge '${startDateStr}' and Timestamp le '${todayStr}'&$top=10000`, 
          undefined, 
          undefined, 
          jwtToken
        );
        attendance = attRes.d?.results || attRes.d || [];
        if (!Array.isArray(attendance)) attendance = [attendance];
      } catch (err) {
        console.warn('Failed to fetch attendance for overview:', err);
      }

      // Aggregations
      const totalVendors = vendors.length;
      const totalUsers = users.length;

      // Active users today: unique clocked-in emails today who have NOT clocked out today
      const todayLogs = attendance.filter((a: any) => (a.Timestamp || a.timestamp) === todayStr);
      const todayInEmails = new Set(
        todayLogs.filter((a: any) => a.Type === 'IN').map((a: any) => (a.Email || a.email || '').toLowerCase())
      );
      const todayOutEmails = new Set(
        todayLogs.filter((a: any) => a.Type === 'OUT').map((a: any) => (a.Email || a.email || '').toLowerCase())
      );
      const todayActiveEmails = new Set(
        Array.from(todayInEmails).filter(email => !todayOutEmails.has(email))
      );
      const todayActiveUsers = todayActiveEmails.size;
      const todayInactiveUsers = Math.max(0, totalUsers - todayActiveUsers);

      const vendorsList = vendors.map((v: any) => {
        const vCode = (v.Vendorcode || getProp(v, 'vendorcode') || '').toString().trim().toUpperCase();
        const vName = v.Vendorname || getProp(v, 'vendorname') || vCode;
        
        // Filter users belonging to this vendor
        const vUsers = users.filter((u: any) => (getProp(u, 'vendorcode') || '').toString().trim().toUpperCase() === vCode);
        const vTotalUsers = vUsers.length;

        // Filter active logs for today for this vendor
        const vTodayLogs = todayLogs.filter((a: any) => {
          // Fallback: look up user by email to get their vendor code
          const aEmail = (a.Email || a.email || '').toLowerCase();
          const matchedUser = users.find((u: any) => (getProp(u, 'email') || '').toLowerCase() === aEmail);
          const uVCode = matchedUser ? (getProp(matchedUser, 'vendorcode') || '').toString().trim().toUpperCase() : '';
          
          const aVCode = (a.Vendorcode || getProp(a, 'vendorcode') || '').toString().trim().toUpperCase();
          return uVCode === vCode || aVCode === vCode;
        });

        const vInEmails = new Set(
          vTodayLogs.filter((a: any) => a.Type === 'IN').map((a: any) => (a.Email || a.email || '').toLowerCase())
        );
        const vOutEmails = new Set(
          vTodayLogs.filter((a: any) => a.Type === 'OUT').map((a: any) => (a.Email || a.email || '').toLowerCase())
        );
        const vActiveEmails = new Set(
          Array.from(vInEmails).filter(email => !vOutEmails.has(email))
        );
        const vActiveUsers = vActiveEmails.size;
        const vInactiveUsers = Math.max(0, vTotalUsers - vActiveUsers);

        return {
          code: vCode,
          name: vName,
          totalUsers: vTotalUsers,
          activeUsers: vActiveUsers,
          inactiveUsers: vInactiveUsers
        };
      });

      // Trend data (last 7 days)
      const dailyActivity = dateArray.map(date => {
        const dayLogs = attendance.filter((a: any) => (a.Timestamp || a.timestamp) === date);
        const activeEmails = new Set(
          dayLogs.filter((a: any) => a.Type === 'IN').map((a: any) => (a.Email || a.email || '').toLowerCase())
        );
        return {
          date,
          active: activeEmails.size
        };
      });

      return res.json({
        role: userRole,
        stats: {
          totalVendors,
          totalUsers,
          todayActiveUsers,
          todayInactiveUsers
        },
        vendorsList,
        dailyActivity
      });

    } else if (userRole === 'VENDOR_ADMIN' || userVendorCode) {
      // 1. Fetch Users under this vendor
      let users: any[] = [];
      try {
        const uRes = await s4hanaRequest(
          'GET', 
          `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=Vendorcode eq '${userVendorCode.toUpperCase()}'&$top=1000`, 
          undefined, 
          undefined, 
          jwtToken
        );
        users = uRes.d?.results || uRes.d || [];
        if (!Array.isArray(users)) users = [users];
      } catch (err) {
        console.warn('Failed to fetch vendor users for overview:', err);
      }

      // SECURITY SAFEGUARD: filter out any users not belonging to caller's vendor code (solves OData filter bypass)
      users = users.filter((u: any) => (getProp(u, 'vendorcode') || '').toString().trim().toUpperCase() === userVendorCode.toUpperCase());

      // 2. Fetch all Attendance for the last 7 days (filtered in Node.js to solve missing vendor_code field in logs)
      let attendance: any[] = [];
      try {
        const attRes = await s4hanaRequest(
          'GET', 
          `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=Timestamp ge '${startDateStr}' and Timestamp le '${todayStr}'&$top=10000`, 
          undefined, 
          undefined, 
          jwtToken
        );
        attendance = attRes.d?.results || attRes.d || [];
        if (!Array.isArray(attendance)) attendance = [attendance];
      } catch (err) {
        console.warn('Failed to fetch vendor attendance for overview:', err);
      }

      const totalUsers = users.length;
      const userEmails = new Set(users.map((u: any) => (getProp(u, 'email') || '').toLowerCase()).filter(Boolean));

      // Filter attendance logs belonging to this vendor's users
      const vendorAttendance = attendance.filter((a: any) => {
        const aEmail = (a.Email || a.email || '').toLowerCase();
        const aVCode = (a.Vendorcode || getProp(a, 'vendorcode') || '').toString().trim().toUpperCase();
        return userEmails.has(aEmail) || aVCode === userVendorCode.toUpperCase();
      });

      // Active users under vendor today: clock-in but not clock-out today
      const todayLogs = vendorAttendance.filter((a: any) => (a.Timestamp || a.timestamp) === todayStr);
      const todayInEmails = new Set(
        todayLogs.filter((a: any) => a.Type === 'IN').map((a: any) => (a.Email || a.email || '').toLowerCase())
      );
      const todayOutEmails = new Set(
        todayLogs.filter((a: any) => a.Type === 'OUT').map((a: any) => (a.Email || a.email || '').toLowerCase())
      );
      const todayActiveEmails = new Set(
        Array.from(todayInEmails).filter(email => !todayOutEmails.has(email))
      );
      const todayActiveUsers = todayActiveEmails.size;
      const todayInactiveUsers = Math.max(0, totalUsers - todayActiveUsers);

      // Trend data (last 7 days)
      const dailyActivity = dateArray.map(date => {
        const dayLogs = vendorAttendance.filter((a: any) => (a.Timestamp || a.timestamp) === date);
        const activeEmails = new Set(
          dayLogs.filter((a: any) => a.Type === 'IN').map((a: any) => (a.Email || a.email || '').toLowerCase())
        );
        return {
          date,
          active: activeEmails.size
        };
      });

      return res.json({
        role: 'VENDOR_ADMIN',
        vendorCode: userVendorCode,
        stats: {
          totalUsers,
          todayActiveUsers,
          todayInactiveUsers
        },
        dailyActivity
      });
    } else {
      // EMPLOYEE Overview
      let attendance: any[] = [];
      try {
        const attRes = await s4hanaRequest(
          'GET', 
          `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=Email eq '${userEmail}'&$top=5000`, 
          undefined, 
          undefined, 
          jwtToken
        );
        attendance = attRes.d?.results || attRes.d || [];
        if (!Array.isArray(attendance)) attendance = [attendance];
      } catch (err) {
        console.warn('Failed to fetch employee attendance for overview:', err);
      }

      // Group by date to pair check-in/out
      const dailyLogs: Record<string, { checkIn: string | null; clockOut: string | null; hours: number; status: string }> = {};
      attendance.forEach((a: any) => {
        const date = a.Timestamp || a.timestamp;
        if (!date) return;
        if (!dailyLogs[date]) {
          dailyLogs[date] = { checkIn: null, clockOut: null, hours: 0, status: a.Status || 'PENDING' };
        }
        
        if (a.Type === 'IN') {
          dailyLogs[date].checkIn = a.Worktime;
        }
        if (a.Type === 'OUT') {
          dailyLogs[date].clockOut = a.Worktime;
          const hrs = parseFloat(getProp(a, 'hoursworked') || '0');
          dailyLogs[date].hours = hrs;
        }
        if (a.Status && a.Status !== 'PENDING') {
          dailyLogs[date].status = a.Status;
        }
      });

      const uniqueDates = Object.keys(dailyLogs);
      const totalDaysWorked = uniqueDates.length;
      let totalHoursWorked = 0;
      uniqueDates.forEach(d => {
        totalHoursWorked += dailyLogs[d].hours;
      });
      const averageDailyHours = totalDaysWorked > 0 ? parseFloat((totalHoursWorked / totalDaysWorked).toFixed(2)) : 0;

      // Check today's status
      const todayLogs = dailyLogs[todayStr] || { checkIn: null, clockOut: null, hours: 0, status: 'PENDING' };
      let todayStatus = 'not-started';
      if (todayLogs.checkIn && todayLogs.clockOut) {
        todayStatus = 'checked-out';
      } else if (todayLogs.checkIn) {
        todayStatus = 'checked-in';
      }

      // Map recent attendance history (last 7 logs)
      const formatTime = (timeStr: string | null) => {
        if (!timeStr) return '-';
        const match = timeStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (match) {
          const h = (match[1] || '00H').replace('H', '').padStart(2, '0');
          const m = (match[2] || '00M').replace('M', '').padStart(2, '0');
          return `${h}:${m}`;
        }
        return timeStr;
      };

      const recentAttendance = uniqueDates
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .slice(0, 7)
        .map(date => {
          const log = dailyLogs[date];
          return {
            date,
            clockIn: formatTime(log.checkIn),
            clockOut: formatTime(log.clockOut),
            hours: log.hours.toFixed(2),
            status: log.status
          };
        });

      return res.json({
        role: userRole,
        stats: {
          totalDaysWorked,
          totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
          averageDailyHours,
          todayStatus,
          todayCheckIn: formatTime(todayLogs.checkIn),
          todayCheckOut: formatTime(todayLogs.clockOut)
        },
        recentAttendance
      });
    }
  } catch (error: any) {
    console.error('getOverviewStats Error:', error);
    res.status(500).json({ message: 'Error generating overview statistics', error: error.message });
  }
};
