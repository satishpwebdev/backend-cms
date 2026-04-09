import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, isAdmin: true, emailVerified: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const checkSubscription = (allowedPlans = ['free', 'pro', 'agency']) => {
  return async (req, res, next) => {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.id },
      });

      if (!subscription || !allowedPlans.includes(subscription.plan)) {
        return res.status(403).json({ error: 'Upgrade required' });
      }

      req.subscription = subscription;
      next();
    } catch (err) {
      return res.status(500).json({ error: 'Failed to check subscription' });
    }
  };
};
