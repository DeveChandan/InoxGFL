import { Router } from 'express';
import { submitWorksheet, getWorksheets } from '../controllers/worksheet';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);
router.get('/all', getWorksheets);
router.post('/submit', submitWorksheet);

export default router;
