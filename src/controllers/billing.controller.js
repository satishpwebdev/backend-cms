import { prisma } from '../config/db.js';
import { PLAN_LIMITS, PLAN_PRICES, PLAN_NAMES } from '../config/plans.js';

export const getBillingInfo = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    const usage = await prisma.usage.findFirst({
      where: {
        userId: req.user.id,
        month: new Date().toISOString().slice(0, 7),
      },
    });

    const pendingPayments = await prisma.paymentRequest.findMany({
      where: { userId: req.user.id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const currentPlan = subscription?.plan || 'basic';
    const limits = PLAN_LIMITS[currentPlan];

    res.json({
      subscription: subscription || { plan: 'basic', status: 'active' },
      usage: usage || { rowsUpdated: 0, aiCalls: 0 },
      limits,
      pendingPayments,
      planPrices: PLAN_PRICES,
    });
  } catch (err) {
    console.error('getBillingInfo error:', err);
    res.status(500).json({ error: 'Failed to fetch billing info' });
  }
};

export const submitPaymentRequest = async (req, res) => {
  try {
    const { plan, transactionId } = req.body;
    const userId = req.user.id;

    if (!plan || !PLAN_PRICES.hasOwnProperty(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    if (!transactionId || transactionId.trim().length < 5) {
      return res.status(400).json({ error: 'Invalid transaction ID' });
    }

    const amount = PLAN_PRICES[plan];
    if (amount === 0) {
      const sub = await prisma.subscription.upsert({
        where: { userId },
        create: { userId, plan: 'basic', status: 'active' },
        update: { plan: 'basic', status: 'active' },
      });
      return res.json({ subscription: sub, message: 'Basic plan activated' });
    }

    const existingPending = await prisma.paymentRequest.findFirst({
      where: { userId, status: 'pending' },
    });

    if (existingPending) {
      return res.status(400).json({ error: 'You already have a pending payment request' });
    }

    const existingTx = await prisma.paymentRequest.findUnique({
      where: { transactionId: transactionId.trim() },
    });

    if (existingTx) {
      return res.status(400).json({ error: 'This transaction ID has already been used' });
    }

    const paymentRequest = await prisma.paymentRequest.create({
      data: {
        userId,
        amount,
        plan,
        transactionId: transactionId.trim(),
        status: 'pending',
      },
    });

    res.status(201).json({
      paymentRequest,
      message: 'Payment request submitted. You will be notified once approved.',
    });
  } catch (err) {
    console.error('submitPaymentRequest error:', err);
    res.status(500).json({ error: 'Failed to submit payment request' });
  }
};

export const getPaymentStatus = async (req, res) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
    });

    const pendingPayments = await prisma.paymentRequest.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      currentPlan: subscription?.plan || 'basic',
      status: subscription?.status || 'active',
      pendingPayments,
    });
  } catch (err) {
    console.error('getPaymentStatus error:', err);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
};

export const getUpiDetails = async (req, res) => {
  res.json({
    upiId: 'acfcm@ptyes',
    message: 'Please pay the exact amount and submit the transaction ID below',
  });
};

export const createCheckoutSession = async (req, res) => {
  try {
    const { priceId } = req.body;
    res.json({ url: 'https://checkout.stripe.com/pay/...' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

export const createPortalSession = async (req, res) => {
  try {
    res.json({ url: 'https://billing.stripe.com/p/...' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create portal session' });
  }
};

export const getAllPaymentRequests = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const payments = await prisma.paymentRequest.findMany({
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);
  } catch (err) {
    console.error('getAllPaymentRequests error:', err);
    res.status(500).json({ error: 'Failed to fetch payment requests' });
  }
};

export const approvePaymentRequest = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const payment = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment request already processed' });
    }

    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'approved', processedAt: new Date() },
    });

    await prisma.subscription.upsert({
      where: { userId: payment.userId },
      create: {
        userId: payment.userId,
        plan: payment.plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan: payment.plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ message: 'Payment approved and plan updated' });
  } catch (err) {
    console.error('approvePaymentRequest error:', err);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
};

export const rejectPaymentRequest = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const payment = await prisma.paymentRequest.findUnique({ where: { id } });
    if (!payment) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    if (payment.status !== 'pending') {
      return res.status(400).json({ error: 'Payment request already processed' });
    }

    await prisma.paymentRequest.update({
      where: { id },
      data: { status: 'rejected', adminNote: reason || null, processedAt: new Date() },
    });

    res.json({ message: 'Payment request rejected' });
  } catch (err) {
    console.error('rejectPaymentRequest error:', err);
    res.status(500).json({ error: 'Failed to reject payment' });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        createdAt: true,
        subscription: { select: { plan: true, status: true, currentPeriodEnd: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const updateUserPlan = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { plan } = req.body;

    if (!PLAN_PRICES.hasOwnProperty(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.subscription.upsert({
      where: { userId: id },
      create: {
        userId: id,
        plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      update: {
        plan,
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const existingUsage = await prisma.usage.findUnique({
      where: {
        userId_month: { userId: id, month: currentMonth },
      },
    });

    if (existingUsage) {
      await prisma.usage.update({
        where: { id: existingUsage.id },
        data: {
          rowsUpdated: 0,
          aiCalls: 0,
        },
      });
    } else {
      await prisma.usage.create({
        data: {
          userId: id,
          month: currentMonth,
          rowsUpdated: 0,
          aiCalls: 0,
        },
      });
    }

    res.json({ message: `User plan updated to ${PLAN_NAMES[plan]}` });
  } catch (err) {
    console.error('updateUserPlan error:', err);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
};
