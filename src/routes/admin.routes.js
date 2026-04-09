import { Router } from 'express';
import {
  getAllPaymentRequests,
  approvePaymentRequest,
  rejectPaymentRequest,
  getAllUsers,
  updateUserPlan,
} from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/payments', getAllPaymentRequests);
router.post('/payments/:id/approve', approvePaymentRequest);
router.post('/payments/:id/reject', rejectPaymentRequest);
router.get('/users', getAllUsers);
router.put('/users/:id/plan', updateUserPlan);

export default router;
