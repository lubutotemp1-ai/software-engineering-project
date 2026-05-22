const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// ─── Doctor routes for recording patient health data ────────────────
// POST /api/health/patient/:patientId - Doctor adds health record for a patient
router.post('/patient/:patientId', async (req, res) => {
  const { record_date, weight, height, blood_pressure, heart_rate, blood_sugar, temperature, notes } = req.body;
  const patientId = req.params.patientId;
  
  if (!record_date) return res.status(400).json({ error: 'Record date is required.' });
  
  try {
    // Verify the patient exists
    const patient = await db.get_('SELECT id FROM users WHERE id = ? AND role = "patient"', [patientId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    
    const result = await db.run_(
      `INSERT INTO health_records (patient_id, record_date, weight, height, blood_pressure, heart_rate, blood_sugar, temperature, notes, recorded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, record_date, weight || null, height || null, blood_pressure || null, heart_rate || null, blood_sugar || null, temperature || null, notes || null, req.user.id]
    );
    const record = await db.get_('SELECT * FROM health_records WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Health record saved!', record });
  } catch (err) { 
    console.error('Error saving patient health record:', err);
    res.status(500).json({ error: 'Server error.' }); 
  }
});

// POST /api/health/patient/:patientId/medication - Doctor adds medication for a patient
router.post('/patient/:patientId/medication', async (req, res) => {
  const { name, dosage, frequency, start_date, end_date, notes } = req.body;
  const patientId = req.params.patientId;
  
  if (!name) return res.status(400).json({ error: 'Medication name is required.' });
  
  try {
    // Verify the patient exists
    const patient = await db.get_('SELECT id FROM users WHERE id = ? AND role = "patient"', [patientId]);
    if (!patient) return res.status(404).json({ error: 'Patient not found.' });
    
    const result = await db.run_(
      `INSERT INTO medications (patient_id, name, dosage, frequency, start_date, end_date, notes, prescribed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [patientId, name, dosage || null, frequency || null, start_date || null, end_date || null, notes || null, req.user.id]
    );
    const med = await db.get_('SELECT * FROM medications WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Medication prescribed!', medication: med });
  } catch (err) { 
    console.error('Error prescribing medication:', err);
    res.status(500).json({ error: 'Server error.' }); 
  }
});

// GET /api/health/patient/:patientId - Doctor views patient health records
router.get('/patient/:patientId', async (req, res) => {
  const patientId = req.params.patientId;
  
  try {
    const rows = await db.all_('SELECT * FROM health_records WHERE patient_id = ? ORDER BY record_date DESC', [patientId]);
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: 'Server error.' }); 
  }
});

// GET /api/health/patient/:patientId/medications - Doctor views patient medications
router.get('/patient/:patientId/medications', async (req, res) => {
  const patientId = req.params.patientId;
  
  try {
    const rows = await db.all_('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC', [patientId]);
    res.json(rows);
  } catch (err) { 
    res.status(500).json({ error: 'Server error.' }); 
  }
});

router.get('/', async (req, res) => {
  try {
    const rows = await db.all_('SELECT * FROM health_records WHERE patient_id = ? OR user_id = ? ORDER BY record_date DESC', [req.user.id, req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/latest', async (req, res) => {
  try {
    const row = await db.get_('SELECT * FROM health_records WHERE patient_id = ? OR user_id = ? ORDER BY record_date DESC LIMIT 1', [req.user.id, req.user.id]);
    res.json(row || null);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.get('/medications', async (req, res) => {
  try {
    const rows = await db.all_('SELECT * FROM medications WHERE patient_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/', async (req, res) => {
  const { record_date, weight, height, blood_pressure, heart_rate, blood_sugar, temperature, notes } = req.body;
  if (!record_date) return res.status(400).json({ error: 'Record date is required.' });
  try {
    const result = await db.run_(
      `INSERT INTO health_records (patient_id, user_id, record_date, weight, height, blood_pressure, heart_rate, blood_sugar, temperature, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, req.user.id, record_date, weight || null, height || null, blood_pressure || null, heart_rate || null, blood_sugar || null, temperature || null, notes || null]
    );
    const record = await db.get_('SELECT * FROM health_records WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Health record saved!', record });
  } catch (err) { 
    console.error('Error saving health record:', err);
    res.status(500).json({ error: 'Failed to save health record: ' + err.message }); 
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const record = await db.get_('SELECT * FROM health_records WHERE id = ? AND patient_id = ?', [req.params.id, req.user.id]);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    await db.run_('DELETE FROM health_records WHERE id = ?', [req.params.id]);
    res.json({ message: 'Record deleted.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

router.post('/medications', async (req, res) => {
  const { name, dosage, frequency, start_date, end_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Medication name is required.' });
  try {
    const result = await db.run_(
      `INSERT INTO medications (patient_id, name, dosage, frequency, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, name, dosage || null, frequency || null, start_date || null, end_date || null, notes || null]
    );
    const med = await db.get_('SELECT * FROM medications WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Medication added!', medication: med });
  } catch (err) { 
    console.error('Error adding medication:', err);
    res.status(500).json({ error: 'Failed to add medication: ' + err.message }); 
  }
});

router.delete('/medications/:id', async (req, res) => {
  try {
    const med = await db.get_('SELECT * FROM medications WHERE id = ? AND patient_id = ?', [req.params.id, req.user.id]);
    if (!med) return res.status(404).json({ error: 'Medication not found.' });
    await db.run_('DELETE FROM medications WHERE id = ?', [req.params.id]);
    res.json({ message: 'Medication removed.' });
  } catch (err) { res.status(500).json({ error: 'Server error.' }); }
});

module.exports = router;
