import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import siteRoutes from './routes/site.routes.js';
import rowRoutes from './routes/row.routes.js';
import wpRoutes from './routes/wp.routes.js';
import billingRoutes from './routes/billing.routes.js';
import adminRoutes from './routes/admin.routes.js';
import usageRoutes from './routes/usage.routes.js';
import chatRoutes from './routes/chat.routes.js';
import stripeWebhookRoutes from './routes/stripe-webhook.routes.js';
import siteFieldRoutes from './routes/siteField.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Stripe webhook needs raw body
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check (keeps existing flow working)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// TEST: Direct route
app.get('/api/test-sites', (req, res) => {
  console.log('[TEST] /api/test-sites called');
  res.json({ message: 'test works' });
});

// Routes - siteFieldRoutes BEFORE siteRoutes (IMPORTANT!)
app.use('/api/auth', authRoutes);
app.use('/api', siteFieldRoutes);
app.use('/api', siteRoutes);
app.use('/api/rows', rowRoutes);
app.use('/api/wp', wpRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/webhooks/stripe', stripeWebhookRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
