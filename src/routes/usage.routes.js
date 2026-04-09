import { Router } from 'express';
import { checkAndIncrementUsage, getUserPlanAndUsage } from '../utils/usage.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.post('/track', async (req, res) => {
  try {
    const { type = 'aiCalls', count = 1 } = req.body;
    
    const result = await checkAndIncrementUsage(req.user.id, type, count);
    
    res.json(result);
  } catch (err) {
    console.error('Track usage error:', err);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

router.get('/status', async (req, res) => {
  try {
    const { plan, limits, usage } = await getUserPlanAndUsage(req.user.id);
    
    res.json({
      plan,
      limits,
      usage: {
        rowsUpdated: usage.rowsUpdated,
        aiCalls: usage.aiCalls,
      },
      month: usage.month,
    });
  } catch (err) {
    console.error('Get usage status error:', err);
    res.status(500).json({ error: 'Failed to get usage status' });
  }
});

export default router;
