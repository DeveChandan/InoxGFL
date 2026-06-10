import { Router } from 'express';
import { getMISReport } from '../controllers/report';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.get('/', getMISReport);

export default router;
