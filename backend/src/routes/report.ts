import { Router } from 'express';
import { getMISReport, getOverviewStats } from '../controllers/report';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.get('/overview', getOverviewStats);
router.get('/', getMISReport);

export default router;
