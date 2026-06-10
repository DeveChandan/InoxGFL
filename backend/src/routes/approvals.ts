import { Router } from 'express';
import { getPendingApprovals, actionApproval, getMatrixRules, createMatrixRule, deleteMatrixRule, updateMatrixRule, bulkActionApproval } from '../controllers/approvals';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.use(authenticateJWT);

router.get('/pending', getPendingApprovals);
router.post('/action/:id', actionApproval);
router.post('/bulk-action', bulkActionApproval);

router.get('/matrix', getMatrixRules);
router.post('/matrix', createMatrixRule);
router.put('/matrix/:id', updateMatrixRule);
router.delete('/matrix/:id', deleteMatrixRule);

export default router;
