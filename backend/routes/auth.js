const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// Helper: Generate password reset token
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

// POST /api/auth/register  (patients only)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, date_of_birth, blood_type } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  try {
    const existing = await db.get_('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run_(
      `INSERT INTO users (name, email, password, role, phone, date_of_birth, blood_type, subscription_plan) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING id`,
      [name, email, hashed, 'patient', phone || null, date_of_birth || null, blood_type || null, 'free']
    );
    const userId = result.lastInsertRowid;
    const token = jwt.sign({ id: userId, email, name, role: 'patient' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created!', token, user: { id: userId, name, email, role: 'patient' } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login  (patients + admins — checks users table)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const user = await db.get_('SELECT * FROM users WHERE email = $1', [email]);
    if (!user || !bcrypt.compareSync(password, user.password))
      return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful!', token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// POST /api/auth/doctor-login  (doctors only — checks doctors table)
router.post('/doctor-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const doctor = await db.get_('SELECT * FROM doctors WHERE email = $1', [email]);
    if (!doctor || !bcrypt.compareSync(password, doctor.password))
      return res.status(401).json({ error: 'Invalid email or password.' });
    const token = jwt.sign({ id: doctor.id, email: doctor.email, name: doctor.name, role: 'doctor', department: doctor.department }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      message: 'Login successful!', token,
      user: { id: doctor.id, name: doctor.name, email: doctor.email, role: 'doctor', department: doctor.department }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'doctor') {
      const doc = await db.get_('SELECT id, name, email, phone, department, specialization, created_at FROM doctors WHERE id = $1', [req.user.id]);
      return res.json({ ...doc, role: 'doctor' });
    }
    const user = await db.get_('SELECT id, name, email, role, phone, date_of_birth, blood_type, created_at FROM users WHERE id = $1', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/change-password (authenticated users)
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) 
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  
  try {
    let user;
    if (req.user.role === 'doctor') {
      user = await db.get_('SELECT * FROM doctors WHERE id = $1', [req.user.id]);
    } else {
      user = await db.get_('SELECT * FROM users WHERE id = $1', [req.user.id]);
    }

    if (!user) return res.status(404).json({ error: 'User not found.' });
    if (!bcrypt.compareSync(currentPassword, user.password))
      return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = bcrypt.hashSync(newPassword, 10);
    const table = req.user.role === 'doctor' ? 'doctors' : 'users';
    
    await db.query(`UPDATE ${table} SET password = $1, updated_at = NOW() WHERE id = $2`, [newHash, req.user.id]);
    res.json({ message: 'Password changed successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while changing password.' });
  }
});

// POST /api/auth/request-password-reset (unauthenticated)
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required.' });

  try {
    const user = await db.get_('SELECT id FROM users WHERE email = $1', [email]);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    await db.run_(
      `INSERT INTO password_reset_tokens (user_id, email, token, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [user.id, email, token, expiresAt.toISOString()]
    );

    // In production, send email with token
    console.log(`Password reset token for ${email}: ${token}`);
    
    res.json({ message: 'Password reset code sent to your email.', token }); // In production, don't send token in response
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while requesting password reset.' });
  }
});

// POST /api/auth/reset-password (unauthenticated)
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword)
    return res.status(400).json({ error: 'Email, code, and new password are required.' });

  try {
    const resetToken = await db.get_(
      `SELECT * FROM password_reset_tokens 
       WHERE email = $1 AND token = $2 AND expires_at > NOW()`,
      [email, code]
    );

    if (!resetToken) 
      return res.status(401).json({ error: 'Invalid or expired reset code.' });

    const newHash = bcrypt.hashSync(newPassword, 10);
    
    // Update user password
    await db.query(`UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`, 
      [newHash, resetToken.user_id]);
    
    // Delete used token
    await db.query(`DELETE FROM password_reset_tokens WHERE id = $1`, [resetToken.id]);

    res.json({ message: 'Password reset successfully! You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while resetting password.' });
  }
});

module.exports = router;
