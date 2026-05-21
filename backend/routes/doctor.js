const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') return res.status(403).json({ error: 'Doctor access required.' });
  next();
};

router.use(authMiddleware);
router.use(doctorOnly);

// GET doctor's own profile
router.get('/profile', async (req, res) => {
  try {
    const doc = await db.get_('SELECT id, name, email, phone, department, specialization, created_at FROM doctors WHERE id = ?', [req.user.id]);
    if (!doc) return res.status(404).json({ error: 'Doctor not found.' });
    res.json(doc);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// GET appointments for this doctor
router.get('/appointments', async (req, res) => {
  try {
    const rows = await db.all_(`
      SELECT a.*, u.name as patient_name, u.email as patient_email, u.phone as patient_phone, u.blood_type,
             d.name as doctor_name
      FROM appointments a
      JOIN users u ON a.patient_id = u.id
      LEFT JOIN doctors d ON a.doctor_id = d.id
      WHERE a.doctor_id = ?
      ORDER BY a.appointment_date DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// UPDATE appointment status
router.put('/appointments/:id', async (req, res) => {
  const { status, notes } = req.body;
  try {
    const appt = await db.get_('SELECT * FROM appointments WHERE id = ? AND doctor_id = ?', [req.params.id, req.user.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    await db.run_('UPDATE appointments SET status = ?, notes = ? WHERE id = ?', [status || appt.status, notes || appt.notes, req.params.id]);
    res.json({ message: 'Appointment updated.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

// GET patient health records
router.get('/patients/:patientId/records', async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // Verify this doctor has an appointment with this patient
    const hasAppt = await db.get_(
      'SELECT id FROM appointments WHERE patient_id = ? AND doctor_id = ?',
      [patientId, req.user.id]
    );
    if (!hasAppt) return res.status(403).json({ error: 'No appointment found with this patient.' });

    // Get patient info
    const patient = await db.get_(
      'SELECT id, name, email, phone, date_of_birth, blood_type FROM users WHERE id = ?',
      [patientId]
    );
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });

    // Get health records — support both patient_id and user_id columns
    let healthRecords = [];
    try {
      healthRecords = await db.all_(
        `SELECT * FROM health_records WHERE patient_id = ? OR user_id = ? ORDER BY record_date DESC, created_at DESC`,
        [patientId, patientId]
      );
    } catch (e) {
      // Fallback if column doesn't exist yet
      try {
        healthRecords = await db.all_(
          `SELECT * FROM health_records WHERE user_id = ? ORDER BY created_at DESC`,
          [patientId]
        );
      } catch { healthRecords = []; }
    }

    // Get medications — gracefully handle missing table
    let medications = [];
    try {
      medications = await db.all_(
        'SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC',
        [patientId]
      );
    } catch { medications = []; }

    // Get appointment history with this doctor
    const appointmentHistory = await db.all_(
      `SELECT * FROM appointments WHERE patient_id = ? AND doctor_id = ? ORDER BY appointment_date DESC`,
      [patientId, req.user.id]
    );

    // Get AI diagnoses shared with this doctor
    let sharedDiagnoses = [];
    try {
      sharedDiagnoses = await db.all_(
        `SELECT * FROM ai_diagnoses WHERE patient_id = ? AND doctor_id = ? ORDER BY created_at DESC`,
        [patientId, req.user.id]
      );
    } catch { sharedDiagnoses = []; }

    res.json({ patient, healthRecords, medications, appointmentHistory, sharedDiagnoses });
  } catch (err) {
    console.error('Patient records error:', err.message);
    res.status(500).json({ error: 'Failed to load patient records: ' + err.message });
  }
});

module.exports = router;