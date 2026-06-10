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
const parseSAPDate = (dateField) => {
    var _a;
    if (!dateField)
        return new Date(0);
    if (dateField.includes('Date(')) {
        return new Date(parseInt(((_a = dateField.match(/\d+/)) === null || _a === void 0 ? void 0 : _a[0]) || '0', 10));
    }
    return new Date(dateField);
};
const getTodayStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userEmail = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || req.body.email || '';
        const jwtToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
        // Fetch records
        const response = yield (0, s4hana_1.s4hanaRequest)('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/AttendanceSet?$filter=Email eq '${userEmail}'`, undefined, undefined, jwtToken);
        let records = response.d && response.d.results ? response.d.results : [];
        // Manual filter fallback for ABAP bug
        records = records.filter((r) => { var _a; return ((_a = r.Email) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === userEmail.toLowerCase(); });
        // Filter for TODAY's records
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysRecords = records.filter((r) => (r.Timestamp || '').startsWith(todayStr));
        const inRecord = todaysRecords.find((r) => r.Type === 'IN');
        const outRecord = todaysRecords.find((r) => r.Type === 'OUT');
        let currentStatus = 'not_started';
        let attendanceData = null;
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
        const formattedTimestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const workTime = `PT${String(now.getHours()).padStart(2, '0')}H${String(now.getMinutes()).padStart(2, '0')}M${String(now.getSeconds()).padStart(2, '0')}S`;
        const payload = {
            Eventid: a.id || a.event_id || "",
            Email: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || a.email || "",
            Type: 'IN',
            Timestamp: formattedTimestamp,
            Worktime: workTime,
            Isexception: "",
            Status: "APPROVED",
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
        // VALIDATION: Check if worksheet is submitted for today
        try {
            const wsResponse = yield (0, s4hana_1.s4hanaRequest)('GET', `/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet`, undefined, undefined, jwtToken);
            let rawWorksheets = wsResponse.d && wsResponse.d.results ? wsResponse.d.results : (wsResponse.d ? [wsResponse.d] : (Array.isArray(wsResponse) ? wsResponse : []));
            let worksheets = rawWorksheets.filter((w) => (w.Email || w.email || '').toLowerCase().trim() === userEmail.toLowerCase().trim());
            const todayStr = new Date().toISOString().split('T')[0];
            const todaysWorksheet = worksheets.find((w) => {
                const d = parseSAPDate(w.Workdate || w.date);
                return d.toISOString().split('T')[0] === todayStr;
            });
            if (!todaysWorksheet) {
                console.warn(`Worksheet missing for user ${userEmail} on ${todayStr}. Found worksheets:`, JSON.stringify(worksheets));
                return res.status(400).json({ requiresWorksheet: true, message: `Debug Info - Total raw worksheets: ${rawWorksheets.length}, Target Email: '${userEmail}', Emails in DB: ${JSON.stringify(rawWorksheets.map((w) => w.Email || w.email))}` });
            }
        }
        catch (wsErr) {
            console.warn("Worksheet check failed, proceeding anyway or handle error", wsErr);
        }
        const now = new Date();
        const formattedTimestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const workTime = `PT${String(now.getHours()).padStart(2, '0')}H${String(now.getMinutes()).padStart(2, '0')}M${String(now.getSeconds()).padStart(2, '0')}S`;
        const payload = {
            Eventid: a.id || a.event_id || "",
            Email: userEmail,
            Type: 'OUT',
            Timestamp: formattedTimestamp,
            Worktime: workTime,
            Isexception: "",
            Status: "APPROVED",
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
                attMap[aDate].clock_in_time = a.Worktime; // Keep raw for frontend to parse or format
            if (a.Type === 'OUT')
                attMap[aDate].clock_out_time = a.Worktime;
        });
        worksheets.forEach((w) => {
            const wDate = parseSAPDate(w.Workdate || w.date).toISOString().split('T')[0];
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
                    Hoursworked: "0",
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
                const wsPayload = {
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
                    console.error("Worksheet POST failed for exception, might already exist or issue:", wsErr);
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
