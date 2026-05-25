const db = require('../db/database');

// Middleware to check AI usage limits
async function checkAIUsageLimit(req, res, next) {
  try {
    const userId = req.user.id;
    const serviceType = req.body.serviceType || req.query.service || 'diagnosis';

    // Get user's current plan limits
    const subscription = await db.get_(
      `SELECT p.ai_diagnosis_limit, p.health_education_limit 
       FROM subscriptions s 
       JOIN plans p ON s.plan_id = p.id 
       WHERE s.user_id = $1`,
      [userId]
    );

    let limit = 6; // Default free plan limit
    if (subscription) {
      limit = serviceType === 'diagnosis' 
        ? subscription.ai_diagnosis_limit 
        : subscription.health_education_limit;
    }

    // Get current usage for this billing period
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await db.get_(
      `SELECT SUM(usage_count) as total_usage 
       FROM ai_usage 
       WHERE user_id = $1 AND service_type = $2 AND period_start >= $3`,
      [userId, serviceType, monthStart.toISOString()]
    );

    const currentUsage = usage?.total_usage || 0;

    if (currentUsage >= limit) {
      return res.status(429).json({
        error: `Monthly limit for ${serviceType} reached. Please upgrade your plan.`,
        current_usage: currentUsage,
        limit: limit,
        service_type: serviceType
      });
    }

    // Attach limit info to request
    req.aiLimit = {
      remaining: limit - currentUsage,
      limit: limit,
      current: currentUsage,
      service: serviceType
    };

    next();
  } catch (err) {
    console.error('Error checking AI usage:', err);
    res.status(500).json({ error: 'Failed to check usage limits.' });
  }
}

// Helper: Record AI usage
async function recordAIUsage(userId, serviceType) {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await db.run_(
      `INSERT INTO ai_usage (user_id, service_type, usage_count, period_start, period_end)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (user_id, service_type, period_start) DO UPDATE 
       SET usage_count = usage_count + 1`,
      [userId, serviceType, monthStart.toISOString(), monthEnd.toISOString()]
    );
  } catch (err) {
    console.error('Error recording AI usage:', err);
  }
}

module.exports = { checkAIUsageLimit, recordAIUsage };
