import { Router } from 'express';
import { clockIn, clockOut, getTodayStatus, addExceptionAttendance, getAttendanceRange } from '../controllers/attendance';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// All attendance routes require an authenticated user
router.use(authenticateJWT);

router.get('/status', getTodayStatus);
router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.post('/exception', addExceptionAttendance);
router.get('/user/:userId/range', getAttendanceRange);

export default router;
