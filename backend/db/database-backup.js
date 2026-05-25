const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://healthportal_user:BrbR3sKAExnna4ROBpA8obkLXVVHQcYZ@dpg-d87lpgojs32c73ef6lo0-a.oregon-postgres.render.com/healthportal',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

// Initialize database tables
async function initializeTables() {
  const client = await pool.connect();
  try {
    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Users table (patients and admins)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'patient',
        phone TEXT,
        date_of_birth TEXT,
        blood_type TEXT,
        subscription_plan TEXT DEFAULT 'free',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Doctors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        department TEXT,
        specialization TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10, 2),
        ai_diagnosis_limit INTEGER DEFAULT 0,
        health_education_limit INTEGER DEFAULT 0,
        stripe_price_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id INTEGER NOT NULL REFERENCES plans(id),
        stripe_subscription_id TEXT,
        status TEXT DEFAULT 'active',
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )
    `);

    // AI Usage tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_usage (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        service_type TEXT NOT NULL,
        usage_count INTEGER DEFAULT 1,
        period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Password reset tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Appointments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        doctor_id INTEGER NOT NULL REFERENCES doctors(id),
        title TEXT NOT NULL,
        description TEXT,
        appointment_date TEXT NOT NULL,
        appointment_time TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Health records table
    await client.query(`
      CREATE TABLE IF NOT EXISTS health_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Medications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS medications (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        dosage TEXT,
        frequency TEXT,
        start_date TEXT,
        end_date TEXT,
        notes TEXT,
        prescribed_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Education materials table
    await client.query(`
      CREATE TABLE IF NOT EXISTS education_materials (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        category TEXT,
        file_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chat messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        sender_role TEXT NOT NULL,
        receiver_id INTEGER,
        receiver_role TEXT,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Diagnosis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS diagnosis (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        symptoms TEXT NOT NULL,
        diagnosis_result TEXT,
        recommendations TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Doctor schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS doctor_schedules (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL REFERENCES doctors(id),
        doctor_name TEXT,
        schedule_date TEXT,
        day_of_week TEXT,
        start_time TEXT,
        end_time TEXT,
        is_available INTEGER DEFAULT 1,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // AI Diagnoses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_diagnoses (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        patient_name TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        duration TEXT,
        severity TEXT,
        diagnosis TEXT NOT NULL,
        sent_to_doctor INTEGER DEFAULT 0,
        doctor_id INTEGER,
        sent_to_doctor_name TEXT,
        appointment_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default plans if they don't exist
    await client.query(`
      INSERT INTO plans (name, description, price, ai_diagnosis_limit, health_education_limit, stripe_price_id)
      VALUES 
        ('Free', 'Basic free plan', 0, 6, 6, 'price_free'),
        ('Pro', 'Professional plan', 9.99, 50, 50, 'price_pro'),
        ('Plus', 'Plus plan', 14.99, 150, 150, 'price_plus'),
        ('Max', 'Maximum usage plan', 24.99, 500, 500, 'price_max')
      ON CONFLICT DO NOTHING
    `);

    // Insert default admin
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password, role) 
      VALUES ('Admin', 'admin@hospital.com', $1, 'admin')
      ON CONFLICT (email) DO NOTHING
    `, [adminPasswordHash]);

    await client.query(`
      INSERT INTO admins (name, email, password) 
      VALUES ('Admin', 'admin@hospital.com', $1)
      ON CONFLICT (email) DO NOTHING
    `, [adminPasswordHash]);

    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Initialize tables on startup
initializeTables().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Helper methods for database queries
const db = {
  query: (sql, params = []) => pool.query(sql, params),
  
  get_: async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows[0];
  },

  run_: async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return {
      lastInsertRowid: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  },

  all_: async (sql, params = []) => {
    const result = await pool.query(sql, params);
    return result.rows;
  }
};

// Gracefully close pool on process exit
process.on('SIGINT', async () => {
  try {
    await pool.end();
    console.log('Database connection pool closed.');
  } catch (err) {
    console.error('Error closing database pool:', err);
  }
  process.exit(0);
});

module.exports = db;
