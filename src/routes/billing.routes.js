import { Router } from 'express';
import {
  getBillingInfo,
  submitPaymentRequest,
  getPaymentStatus,
  getUpiDetails,
  createCheckoutSession,
  createPortalSession,
} from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getBillingInfo);
router.get('/status', getPaymentStatus);
router.get('/upi', getUpiDetails);
router.post('/payment-request', submitPaymentRequest);
router.post('/checkout', createCheckoutSession);
router.post('/portal', createPortalSession);

export default router;
