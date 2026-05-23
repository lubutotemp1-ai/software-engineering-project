const db = require('../db/database');

const PLANS = {
  free: { name: 'Free', limit: 5, priceMonthly: 0 },
  pro: { name: 'Pro', limit: 10, priceMonthly: 5 },
  plus: { name: 'Plus', limit: 15, priceMonthly: 10 },
  max: { name: 'Max', limit: 20, priceMonthly: 20 },
};

function getLimit(plan) {
  return PLANS[plan]?.limit ?? PLANS.free.limit;
}

function startOfCurrentMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function resetPeriodIfNeeded(row) {
  const periodStart = row.period_start ? new Date(row.period_start) : startOfCurrentMonth();
  const monthStart = startOfCurrentMonth();
  if (periodStart < monthStart) {
    await db.run_(
      `UPDATE user_ai_subscriptions SET uses_this_month = 0, period_start = CURRENT_DATE, updated_at = NOW() WHERE user_id = ?`,
      [row.user_id]
    );
    return { ...row, uses_this_month: 0, period_start: monthStart.toISOString().slice(0, 10) };
  }
  return row;
}

async function getOrCreateSubscription(userId) {
  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) throw new Error('Invalid user id for subscription.');
  let row = await db.get_('SELECT * FROM user_ai_subscriptions WHERE user_id = ?', [uid]);
  if (!row) {
    await db.run_(
      `INSERT INTO user_ai_subscriptions (user_id, plan, uses_this_month, period_start) VALUES (?, 'free', 0, CURRENT_DATE)`,
      [uid]
    );
    row = await db.get_('SELECT * FROM user_ai_subscriptions WHERE user_id = ?', [uid]);
  }
  return resetPeriodIfNeeded(row);
}

async function getUsageStatus(userId) {
  const row = await getOrCreateSubscription(userId);
  const plan = row.plan || 'free';
  const limit = getLimit(plan);
  const used = Number(row.uses_this_month) || 0;
  return {
    plan,
    planName: PLANS[plan]?.name || 'Free',
    used,
    limit,
    remaining: Math.max(0, limit - used),
    canUse: used < limit,
    periodStart: row.period_start,
    priceMonthly: PLANS[plan]?.priceMonthly ?? 0,
    hasStripeSubscription: Boolean(row.stripe_subscription_id),
    stripeCustomerId: row.stripe_customer_id || null,
    plans: PLANS,
  };
}

async function consumeAiUse(userId) {
  const status = await getUsageStatus(userId);
  if (!status.canUse) {
    return { allowed: false, ...status };
  }
  await db.run_(
    `UPDATE user_ai_subscriptions SET uses_this_month = uses_this_month + 1, updated_at = NOW() WHERE user_id = ?`,
    [userId]
  );
  const updated = await getUsageStatus(userId);
  return { allowed: true, ...updated };
}

async function setUserPlan(userId, plan, stripeIds = {}) {
  if (!PLANS[plan]) throw new Error('Invalid plan');
  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) throw new Error('Invalid user id.');
  await getOrCreateSubscription(uid);
  await db.run_(
    `UPDATE user_ai_subscriptions
     SET plan = ?, uses_this_month = 0, period_start = CURRENT_DATE,
         stripe_customer_id = COALESCE(?, stripe_customer_id),
         stripe_subscription_id = COALESCE(?, stripe_subscription_id),
         updated_at = NOW()
     WHERE user_id = ?`,
    [plan, stripeIds.customerId || null, stripeIds.subscriptionId || null, uid]
  );
  return getUsageStatus(uid);
}

module.exports = { PLANS, getUsageStatus, consumeAiUse, setUserPlan, getOrCreateSubscription, getLimit };
