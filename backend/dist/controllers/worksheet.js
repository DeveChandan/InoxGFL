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
exports.submitWorksheet = exports.getWorksheets = void 0;
const s4hana_1 = require("../services/s4hana");
const getWorksheets = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const jwtToken = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        const response = yield (0, s4hana_1.s4hanaRequest)('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', undefined, undefined, jwtToken);
        const rawWorksheets = ((_b = response.d) === null || _b === void 0 ? void 0 : _b.results) || response.d || response || [];
        const mappedWorksheets = (Array.isArray(rawWorksheets) ? rawWorksheets : [rawWorksheets]).map((w) => ({
            id: w.Worksheetid || w.id || w.worksheet_id,
            email: w.Email || w.email,
            date: w.Workdate || w.date,
            task_description: w.Taskdescription || w.task_description,
            hours_spent: w.Hoursspent || w.hours_spent,
            status: w.Status || w.status
        }));
        res.json({ message: 'Success', worksheets: mappedWorksheets });
    }
    catch (error) {
        console.error('getWorksheets Error:', error);
        res.status(500).json({ message: 'Error fetching worksheets from S/4HANA', error: error.message });
    }
});
exports.getWorksheets = getWorksheets;
const submitWorksheet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const w = req.body;
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        let workDateStr = w.date || w.Workdate;
        if (!workDateStr) {
            workDateStr = `${formatter.format(new Date())}T00:00:00`;
        }
        else {
            const datePart = workDateStr.split('T')[0];
            workDateStr = `${datePart}T00:00:00`;
        }
        let worksheetId = w.id || w.worksheet_id || w.Worksheetid;
        if (!worksheetId) {
            const randHex = Math.random().toString(16).substring(2, 8).toUpperCase();
            worksheetId = `WS${Date.now()}${randHex}`.substring(0, 20);
        }
        const s4hanaData = {
            Worksheetid: worksheetId,
            Email: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.email) || w.email || "",
            Workdate: workDateStr,
            Taskdescription: w.tasks_description || w.task_description || w.Taskdescription || "",
            Hoursspent: w.hours_spent ? String(w.hours_spent) : (w.Hoursspent || "0"),
            Status: w.status || w.Status || "PENDING"
        };
        const jwtToken = (_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1];
        const response = yield (0, s4hana_1.s4hanaRequest)('POST', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/WorksheetsSet', s4hanaData, undefined, jwtToken);
        res.json({ message: 'Worksheet created successfully in S/4HANA', data: response.d || response });
    }
    catch (error) {
        console.error('submitWorksheet Error:', error);
        res.status(500).json({ message: 'Error submitting worksheet', error: error.message });
    }
});
exports.submitWorksheet = submitWorksheet;
