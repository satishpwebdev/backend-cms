export const PLAN_DETAILS = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    features: ['1 WordPress site', '5 rows/month', '5 AI calls/month'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 99,
    features: ['3 WordPress sites', '20 rows/month', '20 AI calls/month'],
  },
  {
    id: 'advance',
    name: 'Advance',
    price: 199,
    features: ['Unlimited sites', 'Unlimited rows', 'Unlimited AI calls'],
  },
];

export const PLAN_LIMITS = {
  basic: { sites: 1, rowsPerMonth: 5, aiCalls: 5 },
  pro: { sites: 3, rowsPerMonth: 20, aiCalls: 20 },
  advance: { sites: -1, rowsPerMonth: -1, aiCalls: -1 },
};

export const PLAN_PRICES = {
  basic: 0,
  pro: 99,
  advance: 199,
};

export const PLAN_NAMES = {
  basic: 'Basic',
  pro: 'Pro',
  advance: 'Advance',
};

export const getPlanLimits = (planId) => PLAN_LIMITS[planId] || PLAN_LIMITS.basic;