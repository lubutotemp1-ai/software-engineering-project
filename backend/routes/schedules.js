const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// Helper middleware to check if user is a doctor
const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Doctor access required.' });
  }
  next();
};

// GET /api/schedules/my-schedules - Get doctor's own schedules (doctor only)
router.get('/my-schedules', doctorOnly, async (req, res) => {
  try {
    const schedules = await db.all_(
      `SELECT * FROM doctor_schedules WHERE doctor_id = ? ORDER BY schedule_date DESC`,
      [req.user.id]
    );
    res.json(schedules);
  } catch (err) {
    console.error('Get schedules error:', err.message);
    res.status(500).json({ error: 'Failed to fetch schedules.' });
  }
});

// POST /api/schedules/block - Block specific dates (doctor only)
router.post('/block', doctorOnly, async (req, res) => {
  try {
    const { dates, reason } = req.body;
    
    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'Dates array is required.' });
    }

    const doctor = await db.get_('SELECT name FROM doctors WHERE id = ?', [req.user.id]);
    
    // Insert each date
    const results = [];
    for (const date of dates) {
      // Check if date already exists
      const existing = await db.get_(
        'SELECT id FROM doctor_schedules WHERE doctor_id = ? AND schedule_date = ?',
        [req.user.id, date]
      );

      if (existing) {
        // Update existing
        await db.run_(
          'UPDATE doctor_schedules SET is_available = 0, reason = ? WHERE id = ?',
          [reason || 'Doctor unavailable', existing.id]
        );
        results.push(existing.id);
      } else {
        // Insert new
        const result = await db.run_(
          'INSERT INTO doctor_schedules (doctor_id, doctor_name, schedule_date, is_available, reason) VALUES (?, ?, ?, ?, ?)',
          [req.user.id, doctor.name, date, 0, reason || 'Doctor unavailable']
        );
        results.push(result.lastInsertRowid);
      }
    }

    res.json({ message: `${dates.length} date(s) blocked successfully!` });
  } catch (err) {
    console.error('Block dates error:', err.message);
    res.status(500).json({ error: 'Failed to block dates.' });
  }
});

// DELETE /api/schedules/:id - Remove a schedule block (doctor only)
router.delete('/:id', doctorOnly, async (req, res) => {
  try {
    const schedule = await db.get_(
      'SELECT * FROM doctor_schedules WHERE id = ? AND doctor_id = ?',
      [req.params.id, req.user.id]
    );

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }

    await db.run_('DELETE FROM doctor_schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Schedule removed.' });
  } catch (err) {
    console.error('Delete schedule error:', err.message);
    res.status(500).json({ error: 'Failed to remove schedule.' });
  }
});

// GET /api/schedules/doctor/:doctorId/unavailable - Get unavailable dates for a doctor (public/patient)
router.get('/doctor/:doctorId/unavailable', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = 'SELECT schedule_date, reason FROM doctor_schedules WHERE doctor_id = ? AND is_available = 0';
    const params = [req.params.doctorId];

    // Filter by month/year if provided
    if (month && year) {
      query += ' AND strftime("%m", schedule_date) = ? AND strftime("%Y", schedule_date) = ?';
      params.push(month.toString().padStart(2, '0'), year.toString());
    }

    query += ' ORDER BY schedule_date ASC';

    const schedules = await db.all_(query, params);
    
    // Return just the dates and reasons
    const unavailableDates = schedules.map(s => ({
      date: s.schedule_date,
      reason: s.reason
    }));

    res.json(unavailableDates);
  } catch (err) {
    console.error('Get unavailable dates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch unavailable dates.' });
  }
});

// GET /api/schedules/check-date - Check if a specific date is available for a doctor
router.get('/check-date', async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date are required.' });
    }

    // Check if date is blocked
    const blocked = await db.get_(
      'SELECT id, reason FROM doctor_schedules WHERE doctor_id = ? AND schedule_date = ? AND is_available = 0',
      [doctorId, date]
    );

    if (blocked) {
      return res.json({ available: false, reason: blocked.reason });
    }

    // Check if there are any appointments on this date for this doctor
    const doctor = await db.get_('SELECT name FROM doctors WHERE id = ?', [doctorId]);
    if (doctor) {
      const appointments = await db.all_(
        'SELECT appointment_time FROM appointments WHERE doctor_name = ? AND appointment_date = ? AND status != "cancelled"',
        [doctor.name, date]
      );

      // You could add logic here to limit appointments per day if needed
      res.json({ available: true, bookedSlots: appointments.map(a => a.appointment_time) });
    } else {
      res.json({ available: true });
    }
  } catch (err) {
    console.error('Check date error:', err.message);
    res.status(500).json({ error: 'Failed to check date availability.' });
  }
});

// GET /api/schedules/my-unavailable - Get all unavailable dates for current doctor
router.get('/my-unavailable', doctorOnly, async (req, res) => {
  try {
    const schedules = await db.all_(
      `SELECT schedule_date, reason FROM doctor_schedules 
       WHERE doctor_id = ? AND is_available = 0 
       ORDER BY schedule_date DESC`,
      [req.user.id]
    );
    res.json(schedules);
  } catch (err) {
    console.error('Get my unavailable error:', err.message);
    res.status(500).json({ error: 'Failed to fetch unavailable dates.' });
  }
});

module.exports = router;