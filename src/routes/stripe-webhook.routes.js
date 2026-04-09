import { Router } from 'express';
import { prisma } from '../config/db.js';

const router = Router();

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // TODO: Use Stripe SDK to verify webhook signature
    event = req.body;
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      await prisma.subscription.upsert({
        where: { userId: session.metadata.userId },
        update: {
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          plan: session.metadata.plan || 'pro',
          status: 'active',
        },
        create: {
          userId: session.metadata.userId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          plan: session.metadata.plan || 'pro',
          status: 'active',
        },
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: { status: 'canceled', plan: 'free' },
      });
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

export default router;
