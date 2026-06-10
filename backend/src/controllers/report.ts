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

export const getMISReport = async (req: AuthRequest, res: Response) => {
  try {
    const jwtToken = req.headers.authorization?.split(' ')[1];
    
    const userEmail = req.user?.email || '';
    const userRole = req.user?.role || 'EMPLOYEE';
    const userVendorCode = req.user?.vendor_code || '';
    
    // 1. Extract Query Params
    const { startDate, endDate, emp_name, vendor_code, page = '1', limit = '50', fetchAll = 'false' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    // 2. Resolve User Filters (If searching by name or vendor code, we must fetch their emails first)
    let preFilterEmails: string[] | null = null;
    let needsPreFilter = false;
    let usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$top=5000`;
    let userFilters: string[] = [];

    if (userRole === 'EMPLOYEE') {
      userFilters.push(`tolower(Email) eq '${userEmail.toLowerCase()}'`);
      needsPreFilter = true;
    } else if (userRole === 'VENDOR_ADMIN') {
      if (userVendorCode) {
        userFilters.push(`(Vendorcode eq '${userVendorCode.toUpperCase()}' or tolower(Email) eq '${userEmail.toLowerCase()}')`);
      } else {
        userFilters.push(`tolower(Email) eq '${userEmail.toLowerCase()}'`);
      }
      if (emp_name) userFilters.push(`substringof('${emp_name}', Name)`);
      needsPreFilter = true;
    } else {
      // SUPER_ADMIN
      if (vendor_code) {
        userFilters.push(`Vendorcode eq '${(vendor_code as string).toUpperCase()}'`);
        needsPreFilter = true;
      }
      if (emp_name) {
        userFilters.push(`substringof('${emp_name}', Name)`);
        needsPreFilter = true;
      }
    }

    if (needsPreFilter) {
      if (userFilters.length > 0) {
        usersQuery += `&$filter=${userFilters.join(' and ')}`;
      }
      
      let usersRes;
      try {
        usersRes = await s4hanaRequest('GET', usersQuery, undefined, undefined, jwtToken);
      } catch(e) {
        // Fallback if tolower is not supported by SAP Gateway
        if(e.message && e.message.includes('tolower')) {
           usersQuery = usersQuery.replace(/tolower\(Email\) eq '[^']+'/g, `Email eq '${userEmail}'`);
           usersRes = await s4hanaRequest('GET', usersQuery, undefined, undefined, jwtToken);
        } else {
           throw e;
        }
      }
      
      let users = usersRes.d?.results || usersRes.d || [];
      if (!Array.isArray(users)) users = [users];

      // Node.js Level Security: S/4HANA ABAP often ignores complex OData filters. 
      // We MUST manually enforce Row-Level Security here to prevent data leaks.
      if (userRole === 'EMPLOYEE') {
        users = users.filter((u: any) => (getProp(u, 'email') || '').toLowerCase() === userEmail.toLowerCase());
      } else if (userRole === 'VENDOR_ADMIN') {
        users = users.filter((u: any) => {
          const uEmail = (getProp(u, 'email') || '').toLowerCase();
          const uVendor = (getProp(u, 'vendorcode') || '').toUpperCase();
          if (userVendorCode && uVendor === userVendorCode.toUpperCase()) return true;
          if (uEmail === userEmail.toLowerCase()) return true;
          return false;
        });
        
        if (emp_name) {
          const searchName = (emp_name as string).toLowerCase();
          users = users.filter((u: any) => (getProp(u, 'name') || '').toLowerCase().includes(searchName));
        }
      } else {
        // SUPER_ADMIN
        if (vendor_code) {
          users = users.filter((u: any) => (getProp(u, 'vendorcode') || '').toUpperCase() === (vendor_code as string).toUpperCase());
        }
        if (emp_name) {
          const searchName = (emp_name as string).toLowerCase();
          users = users.filter((u: any) => (getProp(u, 'name') || '').toLowerCase().includes(searchName));
        }
      }

      // Preserve exact case from SAP
      preFilterEmails = users.map((u: any) => getProp(u, 'email')).filter(Boolean);
      
      // If a search was performed and NO users matched, return empty instantly.
      if (preFilterEmails.length === 0) {
        return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
      }
    }

    // 3. Construct Attendance OData Query with $top, $skip, and $inlinecount
    let attFilters: string[] = [];
    if (startDate) attFilters.push(`Timestamp ge '${startDate}'`);
    if (endDate) attFilters.push(`Timestamp le '${endDate}'`);
    
    let useODataPagination = true;

    // Inject pre-filtered emails if applicable
    if (preFilterEmails && preFilterEmails.length > 0) {
      if (preFilterEmails.length <= 80) {
        const emailConditions = preFilterEmails.map(email => `Email eq '${email}'`).join(' or ');
        attFilters.push(`(${emailConditions})`);
      } else {
        // If > 80 emails, the URL will be too long for S/4HANA Gateway.
        // We must fetch the entire date range and filter in Node.js instead.
        useODataPagination = false;
      }
    }

    let attQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet`;
    
    if (useODataPagination) {
      attQuery += `?$inlinecount=allpages`;
      if (attFilters.length > 0) {
        attQuery += `&$filter=${attFilters.join(' and ')}`;
      }
      if (fetchAll === 'true') {
        attQuery += `&$top=10000`;
      } else {
        const skip = (pageNum - 1) * limitNum;
        attQuery += `&$top=${limitNum}&$skip=${skip}`;
      }
    } else {
      // Fallback: Fetch a larger set and don't skip
      if (attFilters.length > 0) {
        attQuery += `?$filter=${attFilters.join(' and ')}`;
      }
      attQuery += `${attFilters.length > 0 ? '&' : '?'}top=50000`;
    }

    // Sort by descending to keep most recent records first
    attQuery += `&$orderby=Timestamp desc`;

    let attRes;
    try {
      attRes = await s4hanaRequest('GET', attQuery, undefined, undefined, jwtToken);
    } catch (e: any) {
      // If $orderby fails, fallback without it
      if (e.message && e.message.includes('orderby')) {
        attQuery = attQuery.replace(`&$orderby=Timestamp desc`, '');
        attRes = await s4hanaRequest('GET', attQuery, undefined, undefined, jwtToken);
      } else {
        throw e;
      }
    }

    let attendance = attRes.d?.results || attRes.d || [];
    if (!Array.isArray(attendance)) attendance = [attendance];
    
    // Extract total count from S/4HANA
    const totalCountStr = attRes.d?.__count || 0;
    let totalCount = parseInt(totalCountStr, 10);

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

    // 4. JIT Fetching: Only fetch Users and Vendors that exist in this exact subset!
    const uniqueEmails = Array.from(new Set(attendance.map((a: any) => (a.Email || a.email || '').toLowerCase()).filter(Boolean)));
    const userMap: Record<string, any> = {};
    const vendorMap: Record<string, any> = {};

    if (uniqueEmails.length > 0) {
      // Chunk emails to prevent URL too long errors
      const emailChunks = [];
      for (let i = 0; i < uniqueEmails.length; i += 50) {
        emailChunks.push(uniqueEmails.slice(i, i + 50));
      }

      for (const chunk of emailChunks) {
        const emailFilters = chunk.map(e => `Email eq '${e}'`).join(' or ');
        const usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$filter=${emailFilters}`;
        
        try {
          const uRes = await s4hanaRequest('GET', usersQuery, undefined, undefined, jwtToken);
          let uData = uRes.d?.results || uRes.d || [];
          if (!Array.isArray(uData)) uData = [uData];
          
          const vendorCodesToFetch = new Set<string>();

          uData.forEach((u: any) => {
            const uEmail = getProp(u, 'email');
            if (uEmail) {
              const uVendorCode = getProp(u, 'vendorcode') || '';
              if (uVendorCode) vendorCodesToFetch.add(uVendorCode);
              
              userMap[uEmail.toLowerCase()] = {
                email: uEmail,
                name: getProp(u, 'name') || uEmail,
                vendor_code: uVendorCode
              };
            }
          });

          // JIT Fetch missing Vendors
          const vCodes = Array.from(vendorCodesToFetch);
          if (vCodes.length > 0) {
            const vFilters = vCodes.map(v => `Vendorcode eq '${v}'`).join(' or ');
            const vQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$filter=${vFilters}`;
            const vRes = await s4hanaRequest('GET', vQuery, undefined, undefined, jwtToken);
            let vData = vRes.d?.results || vRes.d || [];
            if (!Array.isArray(vData)) vData = [vData];
            
            vData.forEach((v: any) => {
              const vCode = v.Vendorcode || v.vendor_code;
              vendorMap[vCode.toLowerCase()] = {
                 vendor_code: vCode,
                 vendor_name: v.Vendorname || v.vendor_name
              };
            });
          }

        } catch (err) {
          console.warn("Failed to fetch specific users chunk", err);
        }
      }
    }

    // 5. Group Attendance (IN/OUT pairs)
    const attMap: Record<string, any> = {};
    attendance.forEach((a: any) => {
      const aEmail = a.Email || a.email;
      const aDate = a.Timestamp || a.timestamp;
      if (!aEmail || !aDate) return;
      
      const key = `${aDate}_${aEmail.toLowerCase()}`;
      if (!attMap[key]) {
        attMap[key] = {
          id: a.Eventid || a.id || a.event_id,
          work_date: aDate,
          email: aEmail,
          status: a.Status === 'PENDING' ? 'working' : 'completed',
          overall_approval_status: a.Status,
          is_exception: a.Isexception === 'X',
          hours_worked: a.Hoursworked || '0',
          ip_address: a.Ipaddress || a.ip_address,
          os_system: a.Ossystem || a.os_system,
          readable_location: a.Readablelocation || a.readable_location,
          hidden_location: a.Hiddenloaction || a.Hiddenlocation || a.hidden_location,
          manual_location: a.Manuallocation || a.manual_location,
          IN: null,
          OUT: null
        };
      }
      if (a.Type === 'IN') attMap[key].IN = a;
      if (a.Type === 'OUT') attMap[key].OUT = a;
      
      if (a.Status && a.Status !== 'PENDING') {
         attMap[key].overall_approval_status = a.Status;
      }
    });

    let groupedData = Object.values(attMap);

    // 6. Fetch Worksheets for the JIT subset
    const wsMap: Record<string, any> = {};
    if (groupedData.length > 0) {
      let wsFilters: string[] = [];
      if (startDate) wsFilters.push(`Workdate ge datetime'${startDate}T00:00:00'`);
      if (endDate) wsFilters.push(`Workdate le datetime'${endDate}T23:59:59'`);
      
      // We could add email conditions here but for simplicity we rely on dates for worksheets
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

    // Format Times
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

    let paginatedData = groupedData;
    if (!useODataPagination && fetchAll !== 'true') {
      const startIndex = (pageNum - 1) * limitNum;
      paginatedData = groupedData.slice(startIndex, startIndex + limitNum);
    } else if (fetchAll === 'true') {
      paginatedData = groupedData.slice(0, 10000); 
    }

    // Final Mapping for the Results
    const finalReportData = paginatedData.map((rec: any) => {
      const uInfo = userMap[rec.email.toLowerCase()] || { email: rec.email, name: rec.email, vendor_code: '' };
      const vInfo = uInfo.vendor_code ? vendorMap[uInfo.vendor_code.toLowerCase()] : null;
      
      const wsInfo = wsMap[`${rec.work_date}_${rec.email.toLowerCase()}`];
      
      let clock_in_time = null;
      let clock_out_time = null;
      if (rec.IN) clock_in_time = formatTimeForUI(rec.work_date, rec.IN.Worktime);
      if (rec.OUT) clock_out_time = formatTimeForUI(rec.work_date, rec.OUT.Worktime);
      
      if (rec.IN && rec.OUT) {
         rec.status = 'completed';
      }
      
      return {
        ...rec,
        user: {
          ...uInfo,
          vendor: vInfo
        },
        worksheet: wsInfo ? { tasks_description: getProp(wsInfo, 'taskdescription') || getProp(wsInfo, 'tasks_description') || '' } : null,
        clock_in_time,
        clock_out_time
      };
    });

    if (!useODataPagination) {
      totalCount = groupedData.length;
    } else {
      totalCount = totalCount || finalReportData.length;
    }

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
