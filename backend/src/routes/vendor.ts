import { Router } from 'express';
import { getVendors, createVendor } from '../controllers/vendor';
import { authenticateJWT, requireRole } from '../middleware/auth';

const router = Router();

// All vendor routes require an authenticated user
router.use(authenticateJWT);

// Only SUPER_ADMIN can manage vendors
router.get('/', requireRole(['SUPER_ADMIN']), getVendors);
router.post('/', requireRole(['SUPER_ADMIN']), createVendor);

export default router;
