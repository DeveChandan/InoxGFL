import { Router } from 'express';
import { submitWorksheet } from '../controllers/worksheet';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.post('/submit', submitWorksheet);

export default router;
