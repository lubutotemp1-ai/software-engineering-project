const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { PLANS, getUsageStatus, setUserPlan } = require('../utils/aiUsage');

router.use(authMiddleware);

router.get('/config', (req, res) => {
  res.json({
    stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
    manualUpgradeEnabled: process.env.ALLOW_MANUAL_AI_UPGRADE === 'true',
  });
});

router.get('/usage', async (req, res) => {
  try {
    if (req.user.role !== 'patient') {
      return res.json({
        plan: 'unlimited',
        planName: 'Unlimited',
        used: 0,
        limit: 9999,
        remaining: 9999,
        canUse: true,
        plans: PLANS,
      });
    }
    const status = await getUsageStatus(req.user.id);
    res.json({
      ...status,
      stripeEnabled: Boolean(process.env.STRIPE_SECRET_KEY),
      manualUpgradeEnabled: process.env.ALLOW_MANUAL_AI_UPGRADE === 'true',
    });
  } catch (err) {
    console.error('AI usage error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Failed to load AI usage.' });
  }
});

router.post('/checkout', async (req, res) => {
  const { plan } = req.body;
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can purchase AI plans.' });
  }
  if (!['pro', 'plus', 'max'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Choose pro, plus, or max.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    if (process.env.ALLOW_MANUAL_AI_UPGRADE === 'true') {
      try {
        const status = await setUserPlan(req.user.id, plan);
        return res.json({ manualUpgrade: true, ...status });
      } catch (err) {
        return res.status(500).json({ error: err.message || 'Upgrade failed.' });
      }
    }
    return res.status(503).json({
      error: 'Online payments are not configured. Set STRIPE_SECRET_KEY on the server, or ALLOW_MANUAL_AI_UPGRADE=true for testing.',
      code: 'STRIPE_NOT_CONFIGURED',
    });
  }

  try {
    if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
      return res.status(500).json({ error: 'FRONTEND_URL is required in production to create Stripe checkout URLs.' });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const tier = PLANS[plan];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Health Easy AI — ${tier.name}`,
            description: `${tier.limit} AI uses per month`,
          },
          unit_amount: tier.priceMonthly * 100,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { userId: String(req.user.id), plan },
      success_url: `${frontend}/?ai_subscription=success&plan=${plan}&page=records`,
      cancel_url: `${frontend}/?ai_subscription=cancelled&page=records`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Could not start checkout.' });
  }
});

router.post('/billing-portal', async (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Only patients can manage billing.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Payments are not configured yet.' });
  }
  try {
    const db = require('../db/database');
    const row = await db.get_(
      'SELECT stripe_customer_id FROM user_ai_subscriptions WHERE user_id = ?',
      [req.user.id]
    );
    if (!row?.stripe_customer_id) {
      return res.status(400).json({
        error: 'No billing account found. Subscribe to a paid plan first, then you can manage payment here.',
      });
    }
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const frontend = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer: row.stripe_customer_id,
      return_url: `${frontend}/?ai_subscription=return&page=records`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Billing portal error:', err.message);
    res.status(500).json({ error: 'Could not open billing portal.' });
  }
});

router.post('/confirm-dev-plan', async (req, res) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_AI_UPGRADE !== 'true') {
    return res.status(403).json({ error: 'Not available in production.' });
  }
  const { plan } = req.body;
  if (!['free', 'pro', 'plus', 'max'].includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan.' });
  }
  try {
    const status = await setUserPlan(req.user.id, plan);
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.handleStripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe not configured');
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = parseInt(session.metadata?.userId, 10);
      const plan = session.metadata?.plan;
      if (userId && plan && PLANS[plan]) {
        await setUserPlan(userId, plan, {
          customerId: session.customer,
          subscriptionId: session.subscription,
        });
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userRow = await require('../db/database').get_(
        'SELECT user_id FROM user_ai_subscriptions WHERE stripe_subscription_id = ?',
        [sub.id]
      );
      if (userRow) await setUserPlan(userRow.user_id, 'free');
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    return res.status(500).send('Handler failed');
  }

  res.json({ received: true });
};

module.exports = router;
