const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { checkAIUsageLimit, recordAIUsage } = require('../middleware/aiLimits');

// GET /api/payments/plans - Get all available plans
router.get('/plans', async (req, res) => {
  try {
    const plans = await db.all_('SELECT * FROM plans ORDER BY price ASC');
    res.json(plans);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch plans.' });
  }
});

// GET /api/payments/subscription - Get current user's subscription
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const subscription = await db.get_(
      `SELECT s.*, p.name, p.price, p.ai_diagnosis_limit, p.health_education_limit 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    
    if (!subscription) {
      // User on free plan
      const freePlan = await db.get_('SELECT * FROM plans WHERE name = $1', ['Free']);
      return res.json({
        plan_id: freePlan.id,
        name: freePlan.name,
        price: freePlan.price,
        ai_diagnosis_limit: freePlan.ai_diagnosis_limit,
        health_education_limit: freePlan.health_education_limit,
        status: 'active',
      });
    }
    
    res.json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch subscription.' });
  }
});

// GET /api/payments/ai-usage - Get current user's AI usage
router.get('/ai-usage', authMiddleware, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get subscription limits
    const subscription = await db.get_(
      `SELECT p.ai_diagnosis_limit, p.health_education_limit, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );

    const diagnosisLimit = subscription?.ai_diagnosis_limit || 7;
    const educationLimit = subscription?.health_education_limit || 10;

    // Get current usage
    const diagnosisUsage = await db.get_(
      `SELECT COALESCE(SUM(usage_count), 0) as total FROM ai_usage 
       WHERE user_id = $1 AND service_type = 'diagnosis' AND period_start >= $2`,
      [req.user.id, monthStart.toISOString()]
    );

    const educationUsage = await db.get_(
      `SELECT COALESCE(SUM(usage_count), 0) as total FROM ai_usage 
       WHERE user_id = $1 AND service_type = 'education' AND period_start >= $2`,
      [req.user.id, monthStart.toISOString()]
    );

    res.json({
      plan: subscription?.plan_name || 'Free',
      diagnosis: {
        used: diagnosisUsage?.total || 0,
        limit: diagnosisLimit,
        remaining: Math.max(0, diagnosisLimit - (diagnosisUsage?.total || 0))
      },
      education: {
        used: educationUsage?.total || 0,
        limit: educationLimit,
        remaining: Math.max(0, educationLimit - (educationUsage?.total || 0))
      },
      billingPeriodStart: monthStart.toISOString()
    });
  } catch (err) {
    console.error('Error getting AI usage:', err);
    res.status(500).json({ error: 'Failed to fetch AI usage.' });
  }
});

// POST /api/payments/create-checkout-session - Create Stripe checkout session
router.post('/create-checkout-session', authMiddleware, async (req, res) => {
  const { plan_id, plan_name, plan_price, ai_diagnosis_limit, health_education_limit } = req.body;
  
  try {
    const user = await db.get_('SELECT * FROM users WHERE id = $1', [req.user.id]);
    
    // Validate and convert price to integer cents
    const priceInCents = Math.round(parseFloat(plan_price) * 100);
    if (isNaN(priceInCents) || (priceInCents < 50 && priceInCents !== 0)) {
      return res.status(400).json({ error: 'Invalid price. Price must be at least $0.50.' });
    }
    
    // Create Stripe session with plan details from frontend
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan_name,
            description: `${ai_diagnosis_limit} AI Diagnosis uses + ${health_education_limit} Health Education uses`,
          },
          unit_amount: priceInCents,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${process.env.FRONTEND_URL}/dashboard?subscription=success`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?subscription=cancel`,
      metadata: {
        user_id: req.user.id,
        plan_id: plan_id,
        plan_name: plan_name,
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// POST /api/payments/webhook - Stripe webhook for payment completion
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.sendStatus(400);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const { user_id, plan_id, plan_name } = session.metadata;

        // Get plan limits based on plan name
        const planLimits = {
          'Free': { ai_diagnosis_limit: 7, health_education_limit: 10, price: 0 },
          'Pro': { ai_diagnosis_limit: 50, health_education_limit: 100, price: 24.99 },
          'Plus': { ai_diagnosis_limit: 150, health_education_limit: 300, price: 74.99 },
          'Max': { ai_diagnosis_limit: 500, health_education_limit: 1000, price: 119.99 },
        }[plan_name] || { ai_diagnosis_limit: 7, health_education_limit: 10, price: 0 };

        // Ensure plan exists in database
        await db.run_(
          `INSERT INTO plans (id, name, price, ai_diagnosis_limit, health_education_limit)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET
           name = excluded.name,
           price = excluded.price,
           ai_diagnosis_limit = excluded.ai_diagnosis_limit,
           health_education_limit = excluded.health_education_limit`,
          [plan_id, plan_name, planLimits.price, planLimits.ai_diagnosis_limit, planLimits.health_education_limit]
        );

        // Create or update subscription
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        await db.run_(
          `INSERT OR REPLACE INTO subscriptions (user_id, plan_id, stripe_subscription_id, status, current_period_start, current_period_end)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [user_id, plan_id, session.subscription || session.id, 'active', now.toISOString(), nextMonth.toISOString()]
        );

        // Update user subscription plan
        await db.run_(
          'UPDATE users SET subscription_plan = ? WHERE id = ?',
          [plan_name, user_id]
        );

        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const status = event.type === 'customer.subscription.deleted' ? 'cancelled' : subscription.status;
        
        await db.run_(
          'UPDATE subscriptions SET status = ? WHERE stripe_subscription_id = ?',
          [status, subscription.id]
        );
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
