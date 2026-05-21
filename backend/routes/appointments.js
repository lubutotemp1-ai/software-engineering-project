const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET all appointments for the logged-in patient
router.get('/', async (req, res) => {
  try {
    const rows = await db.all_(
      `SELECT a.*, d.name as doctor_name, d.department, d.specialization, d.phone as doctor_phone
       FROM appointments a
       LEFT JOIN doctors d ON d.id = a.doctor_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST - book a new appointment
router.post('/', async (req, res) => {
  const { doctor_id, title, description, appointment_date, appointment_time } = req.body;

  if (!doctor_id || !title || !appointment_date || !appointment_time)
    return res.status(400).json({ error: 'Doctor, title, date, and time are required.' });

  try {
    // Lookup doctor details
    const doctor = await db.get_('SELECT id, name, department, specialization FROM doctors WHERE id = ?', [doctor_id]);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found.' });

    // CRITICAL: Check if the requested date is blocked by the doctor
    const blockedDate = await db.get_(
      'SELECT id, reason FROM doctor_schedules WHERE doctor_id = ? AND schedule_date = ? AND is_available = FALSE',
      [doctor_id, appointment_date]
    );
    if (blockedDate) {
      const reasonText = blockedDate.reason ? ` Reason: ${blockedDate.reason}` : '';
      return res.status(400).json({ 
        error: `This date is unavailable for Dr. ${doctor.name}.${reasonText}` 
      });
    }

    const result = await db.run_(
      `INSERT INTO appointments (patient_id, doctor_id, title, description, appointment_date, appointment_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, doctor.id, title, description || null, appointment_date, appointment_time]
    );

    const appt = await db.get_(
      `SELECT a.*, d.name as doctor_name, d.department, d.specialization
       FROM appointments a LEFT JOIN doctors d ON d.id = a.doctor_id
       WHERE a.id = ?`,
      [result.lastInsertRowid]
    );
    res.status(201).json({ message: 'Appointment booked successfully!', appointment: appt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT - update appointment status/notes
router.put('/:id', async (req, res) => {
  const { status, notes } = req.body;
  try {
    const appt = await db.get_('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', [req.params.id, req.user.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    await db.run_('UPDATE appointments SET status = ?, notes = ? WHERE id = ?', [status || appt.status, notes || appt.notes, req.params.id]);
    res.json({ message: 'Appointment updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE - cancel appointment
router.delete('/:id', async (req, res) => {
  try {
    const appt = await db.get_('SELECT * FROM appointments WHERE id = ? AND patient_id = ?', [req.params.id, req.user.id]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found.' });
    await db.run_('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Appointment cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
