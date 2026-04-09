import { Router } from 'express';
import {
  getRows,
  createRow,
  updateRow,
  deleteRow,
  bulkUpdateRows,
  importRows,
} from '../controllers/row.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/', getRows);
router.post('/', createRow);
router.put('/:id', updateRow);
router.delete('/:id', deleteRow);
router.post('/bulk', bulkUpdateRows);
router.post('/import', importRows);

export default router;
