import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import { registerSchema, loginSchema } from '../middleware/validators.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

export const register = async (req, res) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const emailToken = crypto.randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        emailToken,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // TODO: Send verification email with emailToken
    // await sendVerificationEmail(email, emailToken);

    const tokens = generateTokens(user.id);

    res.status(201).json({
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokens = generateTokens(user.id);

    res.json({
      user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Login failed' });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const tokens = generateTokens(decoded.userId);

    res.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, isAdmin: true, emailVerified: true, createdAt: true },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });

    res.json({ user, subscription });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};
