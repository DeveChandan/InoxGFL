import { Router } from 'express';
import { login, seedInitialData } from '../controllers/auth';

const router = Router();

router.post('/login', login);
router.get('/seed', seedInitialData); // Only for setup purposes

export default router;
