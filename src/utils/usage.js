import { prisma } from '../config/db.js';

const PLAN_LIMITS = {
  basic: { rowsPerMonth: 50, aiCalls: 20, sites: 1 },
  pro: { rowsPerMonth: 500, aiCalls: 200, sites: 5 },
  advance: { rowsPerMonth: -1, aiCalls: -1, sites: -1 },
};

export async function getUserPlanAndUsage(userId) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  const plan = subscription?.plan || 'basic';
  const limits = PLAN_LIMITS[plan];
  const currentMonth = new Date().toISOString().slice(0, 7);

  let usage = await prisma.usage.findUnique({
    where: { userId_month: { userId, month: currentMonth } },
  });

  if (!usage) {
    usage = await prisma.usage.create({
      data: {
        userId,
        month: currentMonth,
        rowsUpdated: 0,
        aiCalls: 0,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
      },
    });
  }

  return { plan, limits, usage };
}

export async function checkAndIncrementUsage(userId, type = 'rowsUpdated', count = 1) {
  const { plan, limits, usage } = await getUserPlanAndUsage(userId);
  const currentCount = type === 'aiCalls' ? usage.aiCalls : usage.rowsUpdated;
  const limit = type === 'aiCalls' ? limits.aiCalls : limits.rowsPerMonth;

  if (limit !== -1 && currentCount + count > limit) {
    return {
      allowed: false,
      reason: 'limit_exceeded',
      current: currentCount,
      limit,
      plan,
      message: `You've reached your ${type === 'aiCalls' ? 'AI calls' : 'rows'} limit (${limit}/${limit}) for this month. Upgrade to Pro for more!`,
    };
  }

  const updated = await prisma.usage.update({
    where: { id: usage.id },
    data: {
      [type]: { increment: count },
    },
  });

  return {
    allowed: true,
    current: type === 'aiCalls' ? updated.aiCalls : updated.rowsUpdated,
    limit,
    plan,
  };
}

export async function checkSiteLimit(userId) {
  const { limits } = await getUserPlanAndUsage(userId);
  
  const siteCount = await prisma.site.count({
    where: { userId },
  });

  if (limits.sites !== -1 && siteCount >= limits.sites) {
    return {
      allowed: false,
      reason: 'site_limit_exceeded',
      current: siteCount,
      limit: limits.sites,
      message: `You've reached your site limit (${limits.sites}). Upgrade to Pro for more sites!`,
    };
  }

  return { allowed: true, current: siteCount, limit: limits.sites };
}
