const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' });
  next();
};

router.use(authMiddleware);
router.use(adminOnly);

// ── DOCTORS ──────────────────────────────────────────────

// GET all doctors
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await db.all_('SELECT id, name, email, phone, department, specialization, created_at FROM doctors ORDER BY name ASC');
    res.json(doctors);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// POST add a new doctor
router.post('/doctors', async (req, res) => {
  const { name, email, password, phone, department, specialization } = req.body;
  if (!name || !email || !password || !department)
    return res.status(400).json({ error: 'Name, email, password and department are required.' });
  try {
    const existing = await db.get_('SELECT id FROM doctors WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'A doctor with this email already exists.' });
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run_(
      `INSERT INTO doctors (name, email, password, phone, department, specialization) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, phone || null, department, specialization || null]
    );
    const doctor = await db.get_('SELECT id, name, email, phone, department, specialization, created_at FROM doctors WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Doctor added successfully!', doctor });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// PUT update doctor
router.put('/doctors/:id', async (req, res) => {
  const { name, phone, department, specialization, password } = req.body;
  try {
    const doc = await db.get_('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    
    // If password is provided, hash it
    let hashedPassword = doc.password; // Keep existing password if not provided
    if (password && password.trim()) {
      hashedPassword = bcrypt.hashSync(password, 10);
    }
    
    await db.run_(
      'UPDATE doctors SET name = ?, phone = ?, department = ?, specialization = ?, password = ? WHERE id = ?',
      [name || doc.name, phone || doc.phone, department || doc.department, specialization || doc.specialization, hashedPassword, req.params.id]
    );
    res.json({ message: 'Doctor updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// DELETE doctor
router.delete('/doctors/:id', async (req, res) => {
  try {
    const doc = await db.get_('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    await db.run_('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Doctor removed.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// POST reset doctor password
router.post('/doctors/:id/reset-password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  try {
    const doc = await db.get_('SELECT * FROM doctors WHERE id = ?', [req.params.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.run_(
      'UPDATE doctors SET password = ? WHERE id = ?',
      [hashedPassword, req.params.id]
    );
    res.json({ message: `Password reset for Dr. ${doc.name}. They can now login with the new password.` });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── PATIENTS ──────────────────────────────────────────────

// GET all patients
router.get('/patients', async (req, res) => {
  try {
    const patients = await db.all_('SELECT id, name, email, phone, date_of_birth, blood_type, created_at FROM users WHERE role = ? ORDER BY name ASC', ['patient']);
    res.json(patients);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// GET single patient details
router.get('/patients/:id', async (req, res) => {
  try {
    const patient = await db.get_('SELECT id, name, email, phone, date_of_birth, blood_type, created_at FROM users WHERE id = ? AND role = ?', [req.params.id, 'patient']);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    const appointments = await db.all_('SELECT * FROM appointments WHERE patient_id = ? ORDER BY appointment_date DESC', [req.params.id]);
    const healthRecords = await db.all_('SELECT * FROM health_records WHERE patient_id = ? ORDER BY record_date DESC', [req.params.id]);
    const medications = await db.all_('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ patient, appointments, healthRecords, medications });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── ALL APPOINTMENTS ──────────────────────────────────────

router.get('/appointments', async (req, res) => {
  try {
    const rows = await db.all_(`
      SELECT a.*, u.name as patient_name, u.email as patient_email
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      ORDER BY a.appointment_date DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// UPDATE appointment status (admin can confirm/complete/cancel)
router.put('/appointments/:id', async (req, res) => {
  const { status, notes } = req.body;
  try {
    const appt = await db.get_('SELECT * FROM appointments WHERE id = ?', [req.params.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    await db.run_('UPDATE appointments SET status = ?, notes = ? WHERE id = ?', [status || appt.status, notes || appt.notes, req.params.id]);
    res.json({ message: 'Appointment updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── STATS ─────────────────────────────────────────────────

router.get('/stats', async (req, res) => {
  try {
    const [patients, doctors, appointments, pending] = await Promise.all([
      db.get_('SELECT COUNT(*) as count FROM users WHERE role = ?', ['patient']),
      db.get_('SELECT COUNT(*) as count FROM doctors'),
      db.get_('SELECT COUNT(*) as count FROM appointments'),
      db.get_('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['pending']),
    ]);
    res.json({
      totalPatients: patients.count,
      totalDoctors: doctors.count,
      totalAppointments: appointments.count,
      pendingAppointments: pending.count,
    });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/appointments', async (req, res) => {
  try {
    const appts = await db.all_(`
      SELECT a.*, u.name as patient_name, u.email as patient_email
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      ORDER BY a.appointment_date DESC
    `);
    res.json(appts);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// ── AI USAGE MANAGEMENT ──────────────────────────────────

// GET user's AI usage for current month
router.get('/users/:userId/ai-usage', async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await db.get_('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get subscription limits
    const subscription = await db.get_(
      `SELECT p.ai_diagnosis_limit, p.health_education_limit, p.name as plan_name
       FROM subscriptions s
       JOIN plans p ON s.plan_id = p.id
       WHERE s.user_id = ?`,
      [userId]
    );

    const diagnosisLimit = subscription?.ai_diagnosis_limit || 7;
    const educationLimit = subscription?.health_education_limit || 10;

    // Get current usage
    const diagnosisUsage = await db.get_(
      `SELECT COALESCE(SUM(usage_count), 0) as total FROM ai_usage 
       WHERE user_id = ? AND service_type = 'diagnosis' AND period_start >= ?`,
      [userId, monthStart.toISOString()]
    );

    const educationUsage = await db.get_(
      `SELECT COALESCE(SUM(usage_count), 0) as total FROM ai_usage 
       WHERE user_id = ? AND service_type = 'education' AND period_start >= ?`,
      [userId, monthStart.toISOString()]
    );

    res.json({
      user,
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
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST reset AI usage for a user
router.post('/users/:userId/reset-ai-usage', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { service } = req.body; // 'diagnosis', 'education', or 'both'

    const user = await db.get_('SELECT id, name, email FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!service || !['diagnosis', 'education', 'both'].includes(service)) {
      return res.status(400).json({ error: 'Invalid service type. Must be "diagnosis", "education", or "both".' });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (service === 'diagnosis' || service === 'both') {
      await db.run_(
        `DELETE FROM ai_usage WHERE user_id = ? AND service_type = 'diagnosis' AND period_start >= ?`,
        [userId, monthStart.toISOString()]
      );
    }

    if (service === 'education' || service === 'both') {
      await db.run_(
        `DELETE FROM ai_usage WHERE user_id = ? AND service_type = 'education' AND period_start >= ?`,
        [userId, monthStart.toISOString()]
      );
    }

    res.json({
      message: `AI ${service} usage reset successfully for user ${user.name}`,
      user,
      resetService: service,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error resetting AI usage:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
