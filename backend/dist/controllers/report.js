"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMISReport = exports.getProp = void 0;
const s4hana_1 = require("../services/s4hana");
const parseSAPDate = (dateField) => {
    var _a;
    if (!dateField)
        return new Date(0);
    if (dateField.includes('Date(')) {
        return new Date(parseInt(((_a = dateField.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || '0', 10));
    }
    return new Date(dateField);
};
const getProp = (obj, target) => {
    if (!obj)
        return undefined;
    const key = Object.keys(obj).find(k => k.toLowerCase().replace(/_/g, '') === target.toLowerCase().replace(/_/g, ''));
    return key ? obj[key] : undefined;
};
exports.getProp = getProp;
const getMISReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        const userEmail = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || '';
        const userRole = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) || 'EMPLOYEE';
        const userVendorCode = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.vendor_code) || '';
        // 1. Extract Query Params
        const { startDate, endDate, emp_name, vendor_code, page = '1', limit = '50', fetchAll = 'false' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        // 2. Resolve User Filters (If searching by name or vendor code, we must fetch their emails first)
        let preFilterEmails = null;
        let needsPreFilter = false;
        let usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet?$top=5000`;
        let userFilters = [];
        if (userRole === 'EMPLOYEE') {
            userFilters.push(`tolower(Email) eq '${userEmail.toLowerCase()}'`);
            needsPreFilter = true;
        }
        else if (userRole === 'VENDOR_ADMIN') {
            if (userVendorCode) {
                userFilters.push(`(Vendorcode eq '${userVendorCode.toUpperCase()}' or tolower(Email) eq '${userEmail.toLowerCase()}')`);
            }
            else {
                userFilters.push(`tolower(Email) eq '${userEmail.toLowerCase()}'`);
            }
            if (emp_name)
                userFilters.push(`substringof('${emp_name}', Name)`);
            needsPreFilter = true;
        }
        else {
            // SUPER_ADMIN
            if (vendor_code) {
                userFilters.push(`Vendorcode eq '${vendor_code.toUpperCase()}'`);
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
                usersRes = yield (0, s4hana_1.s4hanaRequest)('GET', usersQuery, undefined, undefined, jwtToken);
            }
            catch (e) {
                // Fallback if tolower is not supported by SAP Gateway
                if (e.message && e.message.includes('tolower')) {
                    usersQuery = usersQuery.replace(/tolower\(Email\) eq '[^']+'/g, `Email eq '${userEmail}'`);
                    usersRes = yield (0, s4hana_1.s4hanaRequest)('GET', usersQuery, undefined, undefined, jwtToken);
                }
                else {
                    throw e;
                }
            }
            let users = ((_e = usersRes.d) === null || _e === void 0 ? void 0 : _e.results) || usersRes.d || [];
            if (!Array.isArray(users))
                users = [users];
            // Node.js Level Security: S/4HANA ABAP often ignores complex OData filters. 
            // We MUST manually enforce Row-Level Security here to prevent data leaks.
            if (userRole === 'EMPLOYEE') {
                users = users.filter((u) => ((0, exports.getProp)(u, 'email') || '').toLowerCase() === userEmail.toLowerCase());
            }
            else if (userRole === 'VENDOR_ADMIN') {
                users = users.filter((u) => {
                    const uEmail = ((0, exports.getProp)(u, 'email') || '').toLowerCase();
                    const uVendor = ((0, exports.getProp)(u, 'vendorcode') || '').toUpperCase();
                    if (userVendorCode && uVendor === userVendorCode.toUpperCase())
                        return true;
                    if (uEmail === userEmail.toLowerCase())
                        return true;
                    return false;
                });
                if (emp_name) {
                    const searchName = emp_name.toLowerCase();
                    users = users.filter((u) => ((0, exports.getProp)(u, 'name') || '').toLowerCase().includes(searchName));
                }
            }
            else {
                // SUPER_ADMIN
                if (vendor_code) {
                    users = users.filter((u) => ((0, exports.getProp)(u, 'vendorcode') || '').toUpperCase() === vendor_code.toUpperCase());
                }
                if (emp_name) {
                    const searchName = emp_name.toLowerCase();
                    users = users.filter((u) => ((0, exports.getProp)(u, 'name') || '').toLowerCase().includes(searchName));
                }
            }
            // Preserve exact case from SAP
            preFilterEmails = users.map((u) => (0, exports.getProp)(u, 'email')).filter(Boolean);
            // If a search was performed and NO users matched, return empty instantly.
            if (preFilterEmails.length === 0) {
                return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
            }
        }
        // 3. Construct Attendance OData Query with $top, $skip, and $inlinecount
        let attFilters = [];
        if (startDate)
            attFilters.push(`Timestamp ge '${startDate}'`);
        if (endDate)
            attFilters.push(`Timestamp le '${endDate}'`);
        let useODataPagination = true;
        // Inject pre-filtered emails if applicable
        if (preFilterEmails && preFilterEmails.length > 0) {
            if (preFilterEmails.length <= 80) {
                const emailConditions = preFilterEmails.map(email => `Email eq '${email}'`).join(' or ');
                attFilters.push(`(${emailConditions})`);
            }
            else {
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
            }
            else {
                const skip = (pageNum - 1) * limitNum;
                attQuery += `&$top=${limitNum}&$skip=${skip}`;
            }
        }
        else {
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
            attRes = yield (0, s4hana_1.s4hanaRequest)('GET', attQuery, undefined, undefined, jwtToken);
        }
        catch (e) {
            // If $orderby fails, fallback without it
            if (e.message && e.message.includes('orderby')) {
                attQuery = attQuery.replace(`&$orderby=Timestamp desc`, '');
                attRes = yield (0, s4hana_1.s4hanaRequest)('GET', attQuery, undefined, undefined, jwtToken);
            }
            else {
                throw e;
            }
        }
        let attendance = ((_f = attRes.d) === null || _f === void 0 ? void 0 : _f.results) || attRes.d || [];
        if (!Array.isArray(attendance))
            attendance = [attendance];
        // Extract total count from S/4HANA
        const totalCountStr = ((_g = attRes.d) === null || _g === void 0 ? void 0 : _g.__count) || 0;
        let totalCount = parseInt(totalCountStr, 10);
        if (attendance.length === 0) {
            return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
        }
        // Filter Node.js side if URL was too long or just as a security backup
        if (preFilterEmails) {
            const emailSet = new Set(preFilterEmails.map(e => e.toLowerCase()));
            attendance = attendance.filter((a) => {
                const aEmail = (a.Email || a.email || '').toLowerCase();
                return emailSet.has(aEmail);
            });
        }
        // 4. JIT Fetching: Only fetch Users and Vendors that exist in this exact subset!
        const uniqueEmails = Array.from(new Set(attendance.map((a) => (a.Email || a.email || '').toLowerCase()).filter(Boolean)));
        const userMap = {};
        const vendorMap = {};
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
                    const uRes = yield (0, s4hana_1.s4hanaRequest)('GET', usersQuery, undefined, undefined, jwtToken);
                    let uData = ((_h = uRes.d) === null || _h === void 0 ? void 0 : _h.results) || uRes.d || [];
                    if (!Array.isArray(uData))
                        uData = [uData];
                    const vendorCodesToFetch = new Set();
                    uData.forEach((u) => {
                        const uEmail = (0, exports.getProp)(u, 'email');
                        if (uEmail) {
                            const uVendorCode = (0, exports.getProp)(u, 'vendorcode') || '';
                            if (uVendorCode)
                                vendorCodesToFetch.add(uVendorCode);
                            userMap[uEmail.toLowerCase()] = {
                                email: uEmail,
                                name: (0, exports.getProp)(u, 'name') || uEmail,
                                vendor_code: uVendorCode
                            };
                        }
                    });
                    // JIT Fetch missing Vendors
                    const vCodes = Array.from(vendorCodesToFetch);
                    if (vCodes.length > 0) {
                        const vFilters = vCodes.map(v => `Vendorcode eq '${v}'`).join(' or ');
                        const vQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet?$filter=${vFilters}`;
                        const vRes = yield (0, s4hana_1.s4hanaRequest)('GET', vQuery, undefined, undefined, jwtToken);
                        let vData = ((_j = vRes.d) === null || _j === void 0 ? void 0 : _j.results) || vRes.d || [];
                        if (!Array.isArray(vData))
                            vData = [vData];
                        vData.forEach((v) => {
                            const vCode = v.Vendorcode || v.vendor_code;
                            vendorMap[vCode.toLowerCase()] = {
                                vendor_code: vCode,
                                vendor_name: v.Vendorname || v.vendor_name
                            };
                        });
                    }
                }
                catch (err) {
                    console.warn("Failed to fetch specific users chunk", err);
                }
            }
        }
        // 5. Group Attendance (IN/OUT pairs)
        const attMap = {};
        attendance.forEach((a) => {
            const aEmail = a.Email || a.email;
            const aDate = a.Timestamp || a.timestamp;
            if (!aEmail || !aDate)
                return;
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
            if (a.Type === 'IN')
                attMap[key].IN = a;
            if (a.Type === 'OUT')
                attMap[key].OUT = a;
            if (a.Status && a.Status !== 'PENDING') {
                attMap[key].overall_approval_status = a.Status;
            }
        });
        let groupedData = Object.values(attMap);
        // 6. Fetch Worksheets for the JIT subset
        const wsMap = {};
        if (groupedData.length > 0) {
            let wsFilters = [];
            if (startDate)
                wsFilters.push(`Workdate ge datetime'${startDate}T00:00:00'`);
            if (endDate)
                wsFilters.push(`Workdate le datetime'${endDate}T23:59:59'`);
            // We could add email conditions here but for simplicity we rely on dates for worksheets
            let wsQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet`;
            if (wsFilters.length > 0) {
                wsQuery += `?$filter=${wsFilters.join(' and ')}`;
            }
            try {
                const wsRes = yield (0, s4hana_1.s4hanaRequest)('GET', wsQuery, undefined, undefined, jwtToken);
                let worksheets = ((_k = wsRes.d) === null || _k === void 0 ? void 0 : _k.results) || wsRes.d || [];
                if (!Array.isArray(worksheets))
                    worksheets = [worksheets];
                worksheets.forEach((w) => {
                    const wEmail = (0, exports.getProp)(w, 'email');
                    const wDate = parseSAPDate((0, exports.getProp)(w, 'workdate') || w.date).toISOString().split('T')[0];
                    if (wEmail) {
                        wsMap[`${wDate}_${wEmail.toLowerCase()}`] = w;
                    }
                });
            }
            catch (wsErr) {
                console.warn("Could not fetch worksheets optimally", wsErr);
            }
        }
        // Format Times
        const formatTimeForUI = (dateStr, timeStr) => {
            if (!timeStr)
                return dateStr;
            let hours = "00", mins = "00", secs = "00";
            const match = timeStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
            if (match) {
                if (match[1])
                    hours = match[1].replace('H', '').padStart(2, '0');
                if (match[2])
                    mins = match[2].replace('M', '').padStart(2, '0');
                if (match[3])
                    secs = match[3].replace('S', '').padStart(2, '0');
            }
            return `${dateStr}T${hours}:${mins}:${secs}`;
        };
        let paginatedData = groupedData;
        if (!useODataPagination && fetchAll !== 'true') {
            const startIndex = (pageNum - 1) * limitNum;
            paginatedData = groupedData.slice(startIndex, startIndex + limitNum);
        }
        else if (fetchAll === 'true') {
            paginatedData = groupedData.slice(0, 10000);
        }
        // Final Mapping for the Results
        const finalReportData = paginatedData.map((rec) => {
            const uInfo = userMap[rec.email.toLowerCase()] || { email: rec.email, name: rec.email, vendor_code: '' };
            const vInfo = uInfo.vendor_code ? vendorMap[uInfo.vendor_code.toLowerCase()] : null;
            const wsInfo = wsMap[`${rec.work_date}_${rec.email.toLowerCase()}`];
            let clock_in_time = null;
            let clock_out_time = null;
            if (rec.IN)
                clock_in_time = formatTimeForUI(rec.work_date, rec.IN.Worktime);
            if (rec.OUT)
                clock_out_time = formatTimeForUI(rec.work_date, rec.OUT.Worktime);
            if (rec.IN && rec.OUT) {
                rec.status = 'completed';
            }
            return Object.assign(Object.assign({}, rec), { user: Object.assign(Object.assign({}, uInfo), { vendor: vInfo }), worksheet: wsInfo ? { tasks_description: (0, exports.getProp)(wsInfo, 'taskdescription') || (0, exports.getProp)(wsInfo, 'tasks_description') || '' } : null, clock_in_time,
                clock_out_time });
        });
        if (!useODataPagination) {
            totalCount = groupedData.length;
        }
        else {
            totalCount = totalCount || finalReportData.length;
        }
        res.json({
            message: 'Success',
            data: finalReportData,
            totalCount,
            page: pageNum,
            limit: limitNum
        });
    }
    catch (error) {
        console.error('getMISReport Error:', error);
        res.status(500).json({ message: 'Error generating MIS report', error: error.message });
    }
});
exports.getMISReport = getMISReport;
