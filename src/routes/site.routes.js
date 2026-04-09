import { Router } from 'express';
import { getSites, createSite, updateSite, deleteSite } from '../controllers/site.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/sites', getSites);
router.post('/sites', createSite);
router.put('/sites/:id', updateSite);
router.delete('/sites/:id', deleteSite);

export default router;
