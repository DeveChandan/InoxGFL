import { Router } from 'express';
import { getUsers, createUser, debugUsers, listDebugUsers } from '../controllers/user';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// Unauthenticated debug routes (disabled for security)
// router.get('/debug-users', debugUsers);
// router.get('/list-debug', listDebugUsers);

// All user routes require an authenticated user
router.use(authenticateJWT);

// Both SUPER_ADMIN and VENDOR_ADMIN can manage users (logic handles specifics)
router.get('/', requireRole(['SUPER_ADMIN', 'VENDOR_ADMIN']), getUsers);
router.post('/', requireRole(['SUPER_ADMIN', 'VENDOR_ADMIN']), createUser);

export default router;
