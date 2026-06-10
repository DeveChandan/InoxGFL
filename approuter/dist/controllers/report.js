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
exports.getMISReport = void 0;
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
const getMISReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        const userEmail = ((_b = req.user) === null || _b === void 0 ? void 0 : _b.email) || '';
        const userRole = ((_c = req.user) === null || _c === void 0 ? void 0 : _c.role) || 'EMPLOYEE';
        const userVendorCode = ((_d = req.user) === null || _d === void 0 ? void 0 : _d.vendor_code) || '';
        // 1. Extract Query Params
        const { startDate, endDate, emp_name, vendor_code, page = '1', limit = '50', fetchAll = 'false' } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        // 2. Fetch Vendors once to create a lookup map
        const vendorsRes = yield (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/VendorSet', undefined, undefined, jwtToken);
        let vendors = ((_e = vendorsRes.d) === null || _e === void 0 ? void 0 : _e.results) || vendorsRes.d || [];
        if (!Array.isArray(vendors))
            vendors = [vendors];
        const vendorMap = {};
        vendors.forEach((v) => {
            const vCode = v.Vendorcode || v.vendor_code;
            if (vCode)
                vendorMap[vCode.toLowerCase()] = v;
        });
        // 3. Determine Allowed Users (Security & Filters)
        let usersQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/UsersSet`;
        let userFilters = [];
        if (userRole === 'EMPLOYEE') {
            userFilters.push(`Email eq '${userEmail}'`);
        }
        else {
            if (userRole === 'VENDOR_ADMIN') {
                if (userVendorCode) {
                    userFilters.push(`Vendorcode eq '${userVendorCode}'`);
                }
                else {
                    // If a vendor admin has no vendor code assigned, they see no one
                    userFilters.push(`Email eq 'NO_ACCESS'`);
                }
            }
            else if (vendor_code) { // SUPER_ADMIN filtering by vendor
                userFilters.push(`Vendorcode eq '${vendor_code}'`);
            }
            if (emp_name) {
                userFilters.push(`substringof('${emp_name}', Name)`);
            }
        }
        if (userFilters.length > 0) {
            usersQuery += `?$filter=${userFilters.join(' and ')}`;
        }
        // Fetch authorized/filtered users
        const usersRes = yield (0, s4hana_1.s4hanaRequest)('GET', usersQuery, undefined, undefined, jwtToken);
        let users = ((_f = usersRes.d) === null || _f === void 0 ? void 0 : _f.results) || usersRes.d || [];
        if (!Array.isArray(users))
            users = [users];
        const userMap = {};
        const allowedEmails = [];
        users.forEach((u) => {
            const uEmail = u.Email || u.email;
            if (uEmail) {
                allowedEmails.push(uEmail.toLowerCase());
                const uVendorCode = u.Vendorcode || u.vendor_code;
                const vendorData = uVendorCode ? vendorMap[uVendorCode.toLowerCase()] : null;
                userMap[uEmail.toLowerCase()] = {
                    email: uEmail,
                    name: u.Name || u.name || '',
                    vendor_code: uVendorCode || '',
                    vendor: vendorData ? {
                        vendor_code: vendorData.Vendorcode || vendorData.vendor_code,
                        vendor_name: vendorData.Vendorname || vendorData.vendor_name
                    } : null
                };
            }
        });
        if (allowedEmails.length === 0) {
            return res.json({ message: 'Success', data: [], totalCount: 0, page: pageNum, limit: limitNum });
        }
        // 4. Construct Attendance OData Query
        let attFilters = [];
        if (startDate)
            attFilters.push(`Timestamp ge '${startDate}'`);
        if (endDate)
            attFilters.push(`Timestamp le '${endDate}'`);
        // Apply Email Filters if not requesting everyone
        if (allowedEmails.length < 50 && userRole !== 'SUPER_ADMIN') {
            const emailConditions = allowedEmails.map(email => `Email eq '${email}'`).join(' or ');
            attFilters.push(`(${emailConditions})`);
        }
        else if (userRole === 'EMPLOYEE') {
            attFilters.push(`Email eq '${userEmail}'`);
        }
        let attQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet`;
        if (attFilters.length > 0) {
            attQuery += `?$filter=${attFilters.join(' and ')}`;
        }
        // We request a larger chunk sorted, but S/4HANA standard doesn't support $orderby on generic without config
        // We will fetch the filtered subset. If we can't push ALL emails to $filter, we fetch by Date Range and filter in Node.
        // For 10M records, the Date Range filter is CRITICAL to reducing the payload.
        const attRes = yield (0, s4hana_1.s4hanaRequest)('GET', attQuery, undefined, undefined, jwtToken);
        let attendance = ((_g = attRes.d) === null || _g === void 0 ? void 0 : _g.results) || attRes.d || [];
        if (!Array.isArray(attendance))
            attendance = [attendance];
        // Node.js Level Security Filtering (in case the email filter was too large to pass to S/4HANA OData URL)
        if (userRole !== 'SUPER_ADMIN') {
            const emailSet = new Set(allowedEmails);
            attendance = attendance.filter((a) => {
                const aEmail = (a.Email || a.email || '').toLowerCase();
                return emailSet.has(aEmail);
            });
        }
        // Group Attendance by Date and Email
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
        // Sort descending by date
        groupedData.sort((a, b) => new Date(b.work_date).getTime() - new Date(a.work_date).getTime());
        // 5. In-Memory Pagination
        const totalCount = groupedData.length;
        let paginatedData = groupedData;
        if (fetchAll !== 'true') {
            const startIndex = (pageNum - 1) * limitNum;
            paginatedData = groupedData.slice(startIndex, startIndex + limitNum);
        }
        // 6. Fetch Worksheets ONLY for the paginated subset to save massive memory
        // Get unique dates and emails in the current page
        const wsMap = {};
        if (paginatedData.length > 0) {
            let wsFilters = [];
            if (startDate)
                wsFilters.push(`Workdate ge datetime'${startDate}T00:00:00'`);
            if (endDate)
                wsFilters.push(`Workdate le datetime'${endDate}T23:59:59'`);
            let wsQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet`;
            // If we don't have date filters, fetch all worksheets for these users (not ideal, but fallback)
            if (wsFilters.length > 0) {
                wsQuery += `?$filter=${wsFilters.join(' and ')}`;
            }
            try {
                const wsRes = yield (0, s4hana_1.s4hanaRequest)('GET', wsQuery, undefined, undefined, jwtToken);
                let worksheets = ((_h = wsRes.d) === null || _h === void 0 ? void 0 : _h.results) || wsRes.d || [];
                if (!Array.isArray(worksheets))
                    worksheets = [worksheets];
                worksheets.forEach((w) => {
                    const wEmail = w.Email || w.email;
                    const wDate = parseSAPDate(w.Workdate || w.date).toISOString().split('T')[0];
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
        // Final Mapping for the Paginated Results
        const finalReportData = paginatedData.map((rec) => {
            const uInfo = userMap[rec.email.toLowerCase()] || { email: rec.email, name: rec.email };
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
            return Object.assign(Object.assign({}, rec), { user: uInfo, worksheet: wsInfo ? { tasks_description: wsInfo.Taskdescription || wsInfo.task_description || wsInfo.tasks_description || '' } : null, clock_in_time,
                clock_out_time });
        });
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
