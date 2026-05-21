const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/doctors - returns all doctors with full details for booking
router.get('/', async (req, res) => {
  try {
    const doctors = await db.all_(
      'SELECT id, name, department, specialization, phone FROM doctors ORDER BY department, name ASC'
    );
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;