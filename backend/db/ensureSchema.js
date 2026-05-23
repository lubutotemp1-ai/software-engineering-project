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

async function ensureAiDiagnosesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ai_diagnoses (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      duration TEXT,
      severity TEXT,
      diagnosis TEXT NOT NULL,
      sent_to_doctor BOOLEAN DEFAULT FALSE,
      doctor_id INTEGER,
      sent_to_doctor_name TEXT,
      appointment_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    )
  `);
}

async function ensureRuntimeSchema() {
  await dropChatFks();
  await ensureSubscriptionTable();
  await ensureAiDiagnosesTable();
}

module.exports = { ensureRuntimeSchema, ensureSubscriptionTable, dropChatFks, ensureAiDiagnosesTable };
