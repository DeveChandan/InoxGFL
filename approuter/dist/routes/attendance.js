"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_1 = require("../controllers/attendance");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// All attendance routes require an authenticated user
router.use(auth_1.authenticateJWT);
router.get('/status', attendance_1.getTodayStatus);
router.post('/clock-in', attendance_1.clockIn);
router.post('/clock-out', attendance_1.clockOut);
router.post('/exception', attendance_1.addExceptionAttendance);
router.get('/user/:userId/range', attendance_1.getAttendanceRange);
exports.default = router;
