const db = require('./database');

async function dropChatFks() {
  const statements = [
    'ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey',
    'ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_receiver_id_fkey',
  ];
  for (const sql of statements) {
    try {
      await db.query(sql);
    } catch (err) {
      console.warn('FK drop skipped:', err.message);
    }
  }
}

async function ensureSubscriptionTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_ai_subscriptions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      plan TEXT NOT NULL DEFAULT 'free',
      uses_this_month INTEGER NOT NULL DEFAULT 0,
      period_start DATE NOT NULL DEFAULT CURRENT_DATE,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function ensureRuntimeSchema() {
  await dropChatFks();
  await ensureSubscriptionTable();
}

module.exports = { ensureRuntimeSchema, ensureSubscriptionTable, dropChatFks };
