require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ Missing DATABASE_URL. Set backend/.env or your host environment with your Supabase connection string.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

const runQuery = async (sql, params = []) => {
  const text = convertPlaceholders(sql);
  return pool.query(text, params);
};

const db = {
  query: runQuery,
  get_: async (sql, params = []) => {
    const result = await runQuery(sql, params);
    return result.rows[0] || null;
  },
  all_: async (sql, params = []) => {
    const result = await runQuery(sql, params);
    return result.rows;
  },
  run_: async (sql, params = []) => {
    const skipAutoReturning = /INSERT\s+INTO\s+user_ai_subscriptions\b/i.test(sql);
    const needsReturning = /^\s*INSERT\s+/i.test(sql) && !/\bRETURNING\b/i.test(sql) && !skipAutoReturning;
    const text = convertPlaceholders(needsReturning ? `${sql} RETURNING id` : sql);
    const result = await pool.query(text, params);
    return {
      lastInsertRowid: result.rows?.[0]?.id ?? null,
      rows: result.rows,
      changes: result.rowCount,
    };
  },
};

const initDb = async () => {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'patient',
      phone TEXT,
      date_of_birth TEXT,
      blood_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT,
      specialization TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS health_records (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      user_id INTEGER,
      title TEXT,
      description TEXT,
      record_type TEXT,
      file_url TEXT,
      record_date TEXT NOT NULL,
      weight REAL,
      height REAL,
      blood_pressure TEXT,
      heart_rate INTEGER,
      blood_sugar REAL,
      temperature REAL,
      notes TEXT,
      recorded_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS medications (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      prescribed_by INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (patient_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS education_materials (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      category TEXT,
      file_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      receiver_id INTEGER,
      receiver_role TEXT,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await runQuery(`
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey
  `).catch(() => {});
  await runQuery(`
    ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_receiver_id_fkey
  `).catch(() => {});

  await runQuery(`
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS diagnosis (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      symptoms TEXT NOT NULL,
      diagnosis_result TEXT,
      recommendations TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id SERIAL PRIMARY KEY,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT,
      schedule_date TEXT,
      day_of_week TEXT,
      start_time TEXT,
      end_time TEXT,
      is_available BOOLEAN DEFAULT TRUE,
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  await runQuery(`
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

  await runQuery(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      doctor_id INTEGER,
      user_type TEXT NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (doctor_id) REFERENCES doctors(id)
    )
  `);

  await runQuery(`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  const adminPasswordHash = require('bcryptjs').hashSync('admin123', 10);
  await runQuery(
    `INSERT INTO users (name, email, password, role) VALUES ('Admin', 'admin@hospital.com', $1, 'admin') ON CONFLICT (email) DO NOTHING`,
    [adminPasswordHash]
  );

  await runQuery(
    `INSERT INTO admins (name, email, password) VALUES ('Admin', 'admin@hospital.com', $1) ON CONFLICT (email) DO NOTHING`,
    [adminPasswordHash]
  );
};

process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database connection closed.');
  process.exit(0);
});

module.exports = db;
module.exports.initDb = initDb;
module.exports.pool = pool;