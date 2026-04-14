import { Router } from 'express';
import {
  validateSite,
  getPageIdBySlug,
  updatePageAcf,
  getPages,
  getPosts,
  getStats,
  createPost,
  createPage,
  getCategories,
  getTags,
  getMedia,
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
router.post('/create-post', createPost);
router.post('/create-page', createPage);
router.get('/categories', getCategories);
router.get('/tags', getTags);
router.get('/media', getMedia);

export default router;
