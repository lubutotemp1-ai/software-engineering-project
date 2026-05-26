const bcrypt = require('bcryptjs');
const path = require('path');

let db;
const dbType = process.env.DATABASE_URL?.startsWith('sqlite:') ? 'sqlite' : 'postgresql';

if (dbType === 'sqlite') {
  // Use SQLite for local development
  const Database = require('better-sqlite3');
  const dbPath = process.env.DATABASE_URL.replace('sqlite:', '') || './health_portal.db';
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  console.log('📦 Using SQLite database for development');
} else {
  // Use PostgreSQL for production
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
  });

  db = pool;
}

// Initialize database tables
async function initializeTables() {
  try {
    if (dbType === 'sqlite') {
      initializeSQLite();
    } else {
      await initializePostgreSQL();
    }
    console.log('✅ Database tables initialized successfully');
  } catch (err) {
    console.error('❌ Error initializing database:', err);
    throw err;
  }
}

function initializeSQLite() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'patient',
      phone TEXT,
      date_of_birth TEXT,
      blood_type TEXT,
      subscription_plan TEXT DEFAULT 'free',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Doctors table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      department TEXT,
      specialization TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Plans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL,
      ai_diagnosis_limit INTEGER DEFAULT 0,
      health_education_limit INTEGER DEFAULT 0,
      stripe_price_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      stripe_subscription_id TEXT,
      status TEXT DEFAULT 'active',
      current_period_start DATETIME,
      current_period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(plan_id) REFERENCES plans(id)
    )
  `);

  // AI Usage table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_type TEXT NOT NULL,
      usage_count INTEGER DEFAULT 1,
      period_start DATETIME DEFAULT CURRENT_TIMESTAMP,
      period_end DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Password reset tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Appointments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      appointment_date TEXT NOT NULL,
      appointment_time TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id),
      FOREIGN KEY(doctor_id) REFERENCES doctors(id)
    )
  `);

  // Health records table
  db.exec(`
    CREATE TABLE IF NOT EXISTS health_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    )
  `);

  // Medications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dosage TEXT,
      frequency TEXT,
      start_date TEXT,
      end_date TEXT,
      notes TEXT,
      prescribed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    )
  `);

  // Education materials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS education_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      category TEXT,
      file_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Chat messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL,
      receiver_id INTEGER,
      receiver_role TEXT,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Diagnosis table
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagnosis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      symptoms TEXT NOT NULL,
      diagnosis_result TEXT,
      recommendations TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  // Doctor schedules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS doctor_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      doctor_id INTEGER NOT NULL,
      doctor_name TEXT,
      schedule_date TEXT,
      day_of_week TEXT,
      start_time TEXT,
      end_time TEXT,
      is_available INTEGER DEFAULT 1,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(doctor_id) REFERENCES doctors(id)
    )
  `);

  // AI Diagnoses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_diagnoses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL,
      patient_name TEXT NOT NULL,
      symptoms TEXT NOT NULL,
      duration TEXT,
      severity TEXT,
      diagnosis TEXT NOT NULL,
      sent_to_doctor INTEGER DEFAULT 0,
      doctor_id INTEGER,
      sent_to_doctor_name TEXT,
      appointment_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    )
  `);

  // Admins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default plans
  try {
    const insertPlan = db.prepare(`
      INSERT OR IGNORE INTO plans (name, description, price, ai_diagnosis_limit, health_education_limit, stripe_price_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPlan.run('Free', 'Basic free plan', 0, 7, 10, 'price_free');
    insertPlan.run('Pro', 'Professional plan', 9.99, 50, 100, 'price_pro');
    insertPlan.run('Plus', 'Plus plan', 14.99, 150, 300, 'price_plus');
    insertPlan.run('Max', 'Maximum usage plan', 24.99, 500, 1000, 'price_max');
  } catch (e) {
    // Plans may already exist
    console.error('Error inserting plans:', e.message);
  }

  // Insert default admin
  try {
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `);
    insertUser.run('Admin', 'admin@hospital.com', adminPasswordHash, 'admin');
    
    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO admins (name, email, password) 
      VALUES (?, ?, ?)
    `);
    insertAdmin.run('Admin', 'admin@hospital.com', adminPasswordHash);
  } catch (e) {
    // Admin may already exist
    console.error('Error inserting admin:', e.message);
  }
}

async function initializePostgreSQL() {
  const client = await db.connect();
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
        ('Free', 'Basic free plan', 0, 7, 10, 'price_free'),
        ('Pro', 'Professional plan', 9.99, 50, 100, 'price_pro'),
        ('Plus', 'Plus plan', 14.99, 150, 300, 'price_plus'),
        ('Max', 'Maximum usage plan', 24.99, 500, 1000, 'price_max')
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

    client.release();
  } catch (err) {
    client.release();
    throw err;
  }
}

// Initialize tables on startup
initializeTables().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Helper methods for database queries
const dbModule = {
  query: async (sql, params = []) => {
    if (dbType === 'sqlite') {
      try {
        const stmt = db.prepare(sql);
        return { rows: stmt.all(...params), rowCount: 1 };
      } catch (err) {
        throw err;
      }
    } else {
      // Convert SQLite ? syntax to PostgreSQL $1, $2... syntax
      let convertedSql = sql;
      let paramIndex = 1;
      convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
      // Convert boolean comparisons: = 0 to = FALSE, = 1 to = TRUE
      convertedSql = convertedSql.replace(/= 0\b/g, '= FALSE');
      convertedSql = convertedSql.replace(/= 1\b/g, '= TRUE');
      return await db.query(convertedSql, params);
    }
  },

  get_: async (sql, params = []) => {
    if (dbType === 'sqlite') {
      try {
        const stmt = db.prepare(sql);
        return stmt.get(...params);
      } catch (err) {
        return null;
      }
    } else {
      // Convert SQLite ? syntax to PostgreSQL $1, $2... syntax
      let convertedSql = sql;
      let paramIndex = 1;
      convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
      // Convert boolean comparisons: = 0 to = FALSE, = 1 to = TRUE
      convertedSql = convertedSql.replace(/= 0\b/g, '= FALSE');
      convertedSql = convertedSql.replace(/= 1\b/g, '= TRUE');
      const result = await db.query(convertedSql, params);
      return result.rows[0];
    }
  },

  run_: async (sql, params = []) => {
    if (dbType === 'sqlite') {
      try {
        const stmt = db.prepare(sql);
        const result = stmt.run(...params);
        return {
          lastInsertRowid: result.lastInsertRowid || null,
          changes: result.changes
        };
      } catch (err) {
        return { lastInsertRowid: null, changes: 0 };
      }
    } else {
      // Convert SQLite ? syntax to PostgreSQL $1, $2... syntax
      let convertedSql = sql;
      let paramIndex = 1;
      convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
      // Convert boolean comparisons: = 0 to = FALSE, = 1 to = TRUE
      convertedSql = convertedSql.replace(/= 0\b/g, '= FALSE');
      convertedSql = convertedSql.replace(/= 1\b/g, '= TRUE');
      const result = await db.query(convertedSql, params);
      return {
        lastInsertRowid: result.rows[0]?.id || null,
        changes: result.rowCount
      };
    }
  },

  all_: async (sql, params = []) => {
    if (dbType === 'sqlite') {
      try {
        const stmt = db.prepare(sql);
        return stmt.all(...params);
      } catch (err) {
        return [];
      }
    } else {
      // Convert SQLite ? syntax to PostgreSQL $1, $2... syntax
      let convertedSql = sql;
      let paramIndex = 1;
      convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
      // Convert boolean comparisons: = 0 to = FALSE, = 1 to = TRUE
      convertedSql = convertedSql.replace(/= 0\b/g, '= FALSE');
      convertedSql = convertedSql.replace(/= 1\b/g, '= TRUE');
      const result = await db.query(convertedSql, params);
      return result.rows;
    }
  }
};

// Gracefully close database on process exit
process.on('SIGINT', async () => {
  try {
    if (dbType === 'sqlite') {
      db.close();
    } else {
      await db.end();
    }
    console.log('Database connection closed.');
  } catch (err) {
    console.error('Error closing database:', err);
  }
  process.exit(0);
});

module.exports = dbModule;