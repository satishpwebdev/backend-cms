import { Router } from 'express';
import {
  validateSite,
  getPageIdBySlug,
  updatePageAcf,
  getPages,
  getPosts,
  getStats,
} from '../controllers/wp.controller.js';
import { authenticate } from '../middleware/auth.js';
import { wpLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.use(authenticate);
router.use(wpLimiter);

router.post('/validate', validateSite);
router.post('/page-id', getPageIdBySlug);
router.post('/update-acf', updatePageAcf);
router.get('/pages', getPages);
router.get('/posts', getPosts);
router.get('/stats', getStats);

export default router;
