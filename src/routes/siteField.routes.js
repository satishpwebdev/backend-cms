import { Router } from 'express';
import {
  getSiteFields,
  createSiteField,
  updateSiteField,
  deleteSiteField,
} from '../controllers/siteField.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/sites/:siteId/fields', getSiteFields);
router.post('/sites/:siteId/fields', createSiteField);
router.put('/fields/:id', updateSiteField);
router.delete('/fields/:id', deleteSiteField);

export default router;
