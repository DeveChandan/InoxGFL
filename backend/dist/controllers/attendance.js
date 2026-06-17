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
exports.addExceptionAttendance = exports.getAttendanceRange = exports.submitAttendance = exports.getAttendance = exports.clockOut = exports.clockIn = exports.getTodayStatus = void 0;
const s4hana_1 = require("../services/s4hana");
const getEmailFilter = (email) => {
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
const parseSAPDate = (dateField) => {
    var _a;
    if (!dateField)
        return new Date(0);
    if (dateField.includes('Date(')) {
        return new Date(parseInt(((_a = dateField.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || '0', 10));
    }
    return new Date(dateField);
};
const parseSAPWorktime = (dateStr, timeStr) => {
    if (!timeStr)
        return new Date();
    let hours = 0, mins = 0, secs = 0;
    const match = timeStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (match) {
        if (match[1])
            hours = parseInt(match[1].replace('H', ''), 10);
        if (match[2])
            mins = parseInt(match[2].replace('M', ''), 10);
        if (match[3])
            secs = parseInt(match[3].replace('S', ''), 10);
    }
    const dateParts = dateStr.split('-');
    const year = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const day = parseInt(dateParts[2], 10);
    return new Date(year, month, day, hours, mins, secs);
};
const formatTimeForUI = (dateStr, timeStr) => {
    // timeStr might be like "PT09H30M00S"
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
const getTodayStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userEmail = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || req.body.email || '';
        const jwtToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
        // Fetch records using case-insensitive filter helper
        const response = yield (0, s4hana_1.s4hanaRequest)('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=${getEmailFilter(userEmail)}`, undefined, undefined, jwtToken);
        let records = response.d && response.d.results ? response.d.results : [];
        // Manual filter fallback for ABAP bug
        records = records.filter((r) => { var _a; return ((_a = r.Email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === userEmail.toLowerCase(); });
        // Filter for TODAY's records in IST
        const formatterDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatterDate.format(new Date());
        const todaysRecords = records.filter((r) => (r.Timestamp || '').startsWith(todayStr));
        const inRecord = todaysRecords.find((r) => r.Type === 'IN');
        const outRecord = todaysRecords.find((r) => r.Type === 'OUT');
        let currentStatus = 'not_started';
        let attendanceData = null;
        if (inRecord && outRecord) {
            currentStatus = 'completed';
            attendanceData = {
                clock_in_time: formatTimeForUI(inRecord.Timestamp, inRecord.Worktime),
                clock_out_time: formatTimeForUI(outRecord.Timestamp, outRecord.Worktime),
                readable_location: inRecord.Readablelocation || inRecord.readable_location
            };
        }
        else if (inRecord) {
            currentStatus = 'working';
            attendanceData = {
                clock_in_time: formatTimeForUI(inRecord.Timestamp, inRecord.Worktime),
                readable_location: inRecord.Readablelocation || inRecord.readable_location,
                hidden_location: inRecord.Hiddenloaction || inRecord.hidden_location
            };
        }
        res.json({ status: currentStatus, attendance: attendanceData });
    }
    catch (error) {
        console.error('getTodayStatus Error:', error);
        res.status(500).json({ message: 'Error fetching attendance status', error: error.message });
    }
});
exports.getTodayStatus = getTodayStatus;
const clockIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const a = req.body;
        const now = new Date();
        const formatterDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const formattedTimestamp = formatterDate.format(now);
        const formatterTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const timeParts = formatterTime.format(now).split(':');
        const workTime = `PT${timeParts[0]}H${timeParts[1]}M${timeParts[2]}S`;
        const payload = {
            Eventid: a.id || a.event_id || "",
            Email: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || a.email || "",
            Type: 'IN',
            Timestamp: formattedTimestamp,
            Worktime: workTime,
            Isexception: "",
            Status: "working",
            Hoursworked: "0",
            Currentapprover: "",
            Ipaddress: a.ip_address || a.Ipaddress || "",
            Ossystem: a.os_system || a.Ossystem || "",
            Hiddenloaction: a.hidden_location || a.Hiddenloaction || "",
            Readablelocation: a.readable_location || a.Readablelocation || "",
            Manuallocation: a.manual_location || a.Manuallocation || "",
            Macaddress: a.mac_address || a.Macaddress || ""
        };
        const response = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', payload);
        res.json({ message: 'Clocked In successfully', data: response.d || response });
    }
    catch (error) {
        console.error('clockIn Error:', error);
        res.status(500).json({ message: 'Error clocking in', error: error.message });
    }
});
exports.clockIn = clockIn;
const clockOut = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const a = req.body;
        const userEmail = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || a.email || "";
        const jwtToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
        const now = new Date();
        const formatterDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const todayStr = formatterDate.format(now);
        // VALIDATION: Check if worksheet is submitted for today
        const worksheetSubmitted = a.worksheet_submitted === true;
        if (!worksheetSubmitted) {
            try {
                const wsQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet?$filter=${getEmailFilter(userEmail)}`;
                const wsResponse = yield (0, s4hana_1.s4hanaRequest)('GET', wsQuery, undefined, undefined, jwtToken);
                let rawWorksheets = wsResponse.d && wsResponse.d.results ? wsResponse.d.results : (wsResponse.d ? [wsResponse.d] : (Array.isArray(wsResponse) ? wsResponse : []));
                let worksheets = rawWorksheets.filter((w) => (w.Email || w.email || '').toLowerCase().trim() === userEmail.toLowerCase().trim());
                const todaysWorksheet = worksheets.find((w) => {
                    const d = parseSAPDate(w.Workdate || w.date);
                    const wDateStr = formatterDate.format(d);
                    return wDateStr === todayStr;
                });
                if (!todaysWorksheet) {
                    console.warn(`Worksheet missing for user ${userEmail} on ${todayStr}. Found worksheets:`, JSON.stringify(worksheets));
                    return res.status(400).json({ requiresWorksheet: true, message: `Debug Info - Total raw worksheets: ${rawWorksheets.length}, Target Email: '${userEmail}', Emails in DB: ${JSON.stringify(rawWorksheets.map((w) => w.Email || w.email))}` });
                }
            }
            catch (wsErr) {
                console.warn("Worksheet check failed, proceeding anyway or handle error", wsErr);
            }
        }
        const formatterTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        const timeParts = formatterTime.format(now).split(':');
        const workTime = `PT${timeParts[0]}H${timeParts[1]}M${timeParts[2]}S`;
        // Calculate hours worked as a fallback if not passed by frontend
        let hoursWorked = a.hours_worked ? String(a.hours_worked) : "";
        if (!hoursWorked) {
            try {
                const attQuery = `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=${getEmailFilter(userEmail)}`;
                const attRes = yield (0, s4hana_1.s4hanaRequest)('GET', attQuery, undefined, undefined, jwtToken);
                let attRecords = attRes.d && attRes.d.results ? attRes.d.results : [];
                attRecords = attRecords.filter((r) => { var _a; return ((_a = r.Email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === userEmail.toLowerCase() && (r.Timestamp || '').startsWith(todayStr) && r.Type === 'IN'; });
                if (attRecords.length > 0) {
                    const inRecord = attRecords[0];
                    const inTime = parseSAPWorktime(inRecord.Timestamp, inRecord.Worktime);
                    const diffMs = now.getTime() - inTime.getTime();
                    if (diffMs > 0) {
                        hoursWorked = (diffMs / (1000 * 60 * 60)).toFixed(2);
                    }
                }
            }
            catch (err) {
                console.warn("Could not calculate fallback hours worked:", err);
            }
        }
        if (!hoursWorked)
            hoursWorked = "0";
        const payload = {
            Eventid: a.id || a.event_id || "",
            Email: userEmail,
            Type: 'OUT',
            Timestamp: todayStr,
            Worktime: workTime,
            Isexception: "",
            Status: "completed",
            Hoursworked: hoursWorked,
            Currentapprover: "",
            Ipaddress: a.ip_address || a.Ipaddress || "",
            Ossystem: a.os_system || a.Ossystem || "",
            Hiddenloaction: a.hidden_location || a.Hiddenloaction || "",
            Readablelocation: a.readable_location || a.Readablelocation || "",
            Manuallocation: a.manual_location || a.Manuallocation || "",
            Macaddress: a.mac_address || a.Macaddress || ""
        };
        const response = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', payload);
        res.json({ message: 'Clocked Out successfully', data: response.d || response });
    }
    catch (error) {
        console.error('clockOut Error:', error);
        res.status(500).json({ message: 'Error clocking out', error: error.message });
    }
});
exports.clockOut = clockOut;
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        const response = yield (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', undefined, undefined, jwtToken);
        const rawAttendance = ((_b = response.d) === null || _b === void 0 ? void 0 : _b.results) || response.d || response || [];
        const mappedAttendance = (Array.isArray(rawAttendance) ? rawAttendance : [rawAttendance]).map((a) => ({
            id: a.Eventid || a.id || a.event_id,
            email: a.Email || a.email,
            type: a.Type || a.type,
            timestamp: a.Timestamp || a.timestamp,
            worktime: a.Worktime,
            is_exception: a.Isexception,
            status: a.Status,
            hours_worked: a.Hoursworked,
            current_approver: a.Currentapprover,
            ip_address: a.Ipaddress || a.ip_address,
            os_system: a.Ossystem || a.os_system,
            hidden_location: a.Hiddenloaction || a.Hiddenlocation || a.hidden_location,
            readable_location: a.Readablelocation || a.readable_location,
            manual_location: a.Manuallocation || a.manual_location,
            mac_address: a.Macaddress || a.mac_address
        }));
        res.json({ message: 'Success', attendance: mappedAttendance });
    }
    catch (error) {
        console.error('getAttendance Error:', error);
        res.status(500).json({ message: 'Error fetching attendance from S/4HANA', error: error.message });
    }
});
exports.getAttendance = getAttendance;
const submitAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const attendanceData = req.body;
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // Add default values for new S/4HANA fields
        const payload = Object.assign(Object.assign({}, attendanceData), { Worktime: attendanceData.Worktime || "PT00H00M00S", Isexception: attendanceData.Isexception || "X", Status: attendanceData.Status || "PENDING", Hoursworked: attendanceData.Hoursworked || "0", Currentapprover: attendanceData.Currentapprover || "" });
        const response = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', payload, undefined, jwtToken);
        res.json({ message: 'Attendance submitted successfully to S/4HANA', data: response.d || response });
    }
    catch (error) {
        console.error('submitAttendance Error:', error);
        res.status(500).json({ message: 'Error recording exception', error: error.message });
    }
});
exports.submitAttendance = submitAttendance;
const getAttendanceRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { userId } = req.params;
        const { start_date, end_date } = req.query;
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        // Fetch all attendance and worksheets, then filter
        const [attRes, wsRes] = yield Promise.all([
            (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', undefined, undefined, jwtToken),
            (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', undefined, undefined, jwtToken)
        ]);
        let attendance = ((_b = attRes.d) === null || _b === void 0 ? void 0 : _b.results) || attRes.d || [];
        if (!Array.isArray(attendance))
            attendance = [attendance];
        let worksheets = ((_c = wsRes.d) === null || _c === void 0 ? void 0 : _c.results) || wsRes.d || [];
        if (!Array.isArray(worksheets))
            worksheets = [worksheets];
        // Filter by Email (userId is Email after our user mapping)
        const userEmail = (userId || '').toLowerCase();
        attendance = attendance.filter((a) => (a.Email || a.email || '').toLowerCase() === userEmail);
        worksheets = worksheets.filter((w) => (w.Email || w.email || '').toLowerCase() === userEmail);
        // Group Attendance
        const attMap = {};
        attendance.forEach((a) => {
            const aDate = a.Timestamp || a.timestamp;
            if (!aDate)
                return;
            if (!attMap[aDate]) {
                attMap[aDate] = { work_date: aDate, manual_location: a.Manuallocation || a.manual_location || "" };
            }
            if (a.Type === 'IN')
                attMap[aDate].clock_in_time = formatTimeForUI(aDate, a.Worktime);
            if (a.Type === 'OUT')
                attMap[aDate].clock_out_time = formatTimeForUI(aDate, a.Worktime);
        });
        const formatterDate = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        worksheets.forEach((w) => {
            const wDate = formatterDate.format(parseSAPDate(w.Workdate || w.date));
            if (attMap[wDate]) {
                attMap[wDate].worksheet = { tasks_description: w.Taskdescription || w.task_description || w.tasks_description || "" };
            }
        });
        let records = Object.values(attMap);
        if (start_date)
            records = records.filter((r) => r.work_date >= start_date);
        if (end_date)
            records = records.filter((r) => r.work_date <= end_date);
        res.json({ message: 'Success', records });
    }
    catch (error) {
        console.error('getAttendanceRange Error:', error);
        res.status(500).json({ message: 'Error fetching attendance logs', error: error.message });
    }
});
exports.getAttendanceRange = getAttendanceRange;
const addExceptionAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { target_user_id, records } = req.body;
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!target_user_id || !records || !Array.isArray(records)) {
            return res.status(400).json({ message: 'Invalid payload' });
        }
        // Process each exception record sequentially
        for (const r of records) {
            const workDateStr = r.work_date;
            let hoursWorked = "0";
            if (r.clock_in_time && r.clock_out_time) {
                try {
                    const [inH, inM] = r.clock_in_time.split(':').map(Number);
                    const [outH, outM] = r.clock_out_time.split(':').map(Number);
                    const inMin = inH * 60 + inM;
                    const outMin = outH * 60 + outM;
                    const diffMin = outMin - inMin;
                    if (diffMin > 0) {
                        hoursWorked = (diffMin / 60).toFixed(2);
                    }
                }
                catch (err) {
                    console.warn("Error calculating exception hours:", err);
                }
            }
            // Submit Clock IN
            if (r.clock_in_time) {
                const inPayload = {
                    Email: target_user_id, // target_user_id is the email
                    Type: 'IN',
                    Timestamp: workDateStr,
                    Worktime: `PT${r.clock_in_time.split(':')[0]}H${r.clock_in_time.split(':')[1]}M00S`,
                    Isexception: "X",
                    Status: "PENDING",
                    Hoursworked: "0",
                    Currentapprover: "",
                    Manuallocation: r.manual_location || ""
                };
                yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', inPayload, undefined, jwtToken);
            }
            // Submit Clock OUT
            if (r.clock_out_time) {
                const outPayload = {
                    Email: target_user_id,
                    Type: 'OUT',
                    Timestamp: workDateStr,
                    Worktime: `PT${r.clock_out_time.split(':')[0]}H${r.clock_out_time.split(':')[1]}M00S`,
                    Isexception: "X",
                    Status: "PENDING",
                    Hoursworked: hoursWorked,
                    Currentapprover: "",
                    Manuallocation: r.manual_location || ""
                };
                yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet', outPayload, undefined, jwtToken);
            }
            // Submit Worksheet
            if (r.tasks_description) {
                let wdStr = workDateStr;
                if (!wdStr.includes('T')) {
                    wdStr = `${wdStr}T00:00:00`;
                }
                // Generate a unique Worksheetid required by SAP SEGW OData schema key constraint
                const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
                const worksheetId = `WS${Date.now()}${randHex}`.substring(0, 20);
                const wsPayload = {
                    Worksheetid: worksheetId,
                    Email: target_user_id,
                    Workdate: wdStr,
                    Taskdescription: r.tasks_description,
                    Hoursspent: "0",
                    Status: "PENDING"
                };
                try {
                    yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', wsPayload, undefined, jwtToken);
                }
                catch (wsErr) {
                    console.error("Worksheet POST failed for exception, might already exist or issue:", wsErr.message);
                }
            }
        }
        res.json({ message: 'Exception records submitted successfully for approval' });
    }
    catch (error) {
        console.error('addExceptionAttendance Error:', error);
        res.status(500).json({ message: 'Error recording exception', error: error.message });
    }
});
exports.addExceptionAttendance = addExceptionAttendance;
