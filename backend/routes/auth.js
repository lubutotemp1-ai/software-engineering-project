const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

// POST /api/auth/register  (patients only)
router.post('/register', async (req, res) => {
  const { name, email, password, phone, date_of_birth, blood_type } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  try {
    const existing = await db.get_('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });
    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run_(
      `INSERT INTO users (name, email, password, phone, date_of_birth, blood_type) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, hashed, phone || null, date_of_birth || null, blood_type || null]
    );
    const token = jwt.sign({ id: result.lastInsertRowid, email, name, role: 'patient' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created!', token, user: { id: result.lastInsertRowid, name, email, role: 'patient' } });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// POST /api/auth/login  (patients + admins — checks users table)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required.' });
  try {
    const user = await db.get_('SELECT * FROM users WHERE email = ?', [email]);
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
    const doctor = await db.get_('SELECT * FROM doctors WHERE email = ?', [email]);
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
      const doc = await db.get_('SELECT id, name, email, phone, department, specialization, created_at FROM doctors WHERE id = ?', [req.user.id]);
      return res.json({ ...doc, role: 'doctor' });
    }
    const user = await db.get_('SELECT id, name, email, role, phone, date_of_birth, blood_type, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/auth/forgot-password - Request password reset for any user type
router.post('/forgot-password', async (req, res) => {
  const { email, userType } = req.body;
  if (!email || !userType) {
    return res.status(400).json({ error: 'Email and userType are required.' });
  }

  try {
    let user = null;
    let actualUserType = userType; // 'patient', 'admin', or 'doctor'
    let userId = null;
    let doctorId = null;

    if (userType === 'doctor') {
      user = await db.get_('SELECT id, email FROM doctors WHERE email = ?', [email]);
      if (user) {
        doctorId = user.id;
      }
    } else {
      // For both patients and admins, check users table
      user = await db.get_('SELECT id, email, role FROM users WHERE email = ?', [email]);
      if (user) {
        userId = user.id;
        actualUserType = user.role; // Use actual role from DB
      }
    }

    if (!user) {
      // Return same message for security - don't reveal if email exists
      return res.status(200).json({ 
        message: 'If an account exists with this email, a password reset token has been sent.' 
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Store token in database
    await db.run_(
      `INSERT INTO password_reset_tokens (user_id, doctor_id, user_type, email, token, expires_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, doctorId, actualUserType, email, token, expiresAt.toISOString()]
    );

    // In production, send email here. For now, return token for demo purposes
    res.status(200).json({ 
      message: 'Password reset token generated successfully.',
      resetToken: token, // In production, this should be sent via email instead
      expiresIn: '1 hour'
    });

  } catch (err) {
    console.error('Error in forgot-password:', err);
    res.status(500).json({ error: 'Server error during password reset request.' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;
  
  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, token, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    // Find valid reset token
    const resetToken = await db.get_(
      `SELECT * FROM password_reset_tokens 
       WHERE email = ? AND token = ? AND is_used = FALSE AND expires_at > NOW()`,
      [email, token]
    );

    if (!resetToken) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password based on user type
    if (resetToken.user_type === 'doctor') {
      await db.run_(
        'UPDATE doctors SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.doctor_id]
      );
    } else {
      // patient or admin
      await db.run_(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, resetToken.user_id]
      );
    }

    // Mark token as used
    await db.run_(
      'UPDATE password_reset_tokens SET is_used = TRUE WHERE id = ?',
      [resetToken.id]
    );

    res.status(200).json({ message: 'Password reset successfully. Please log in with your new password.' });

  } catch (err) {
    console.error('Error in reset-password:', err);
    res.status(500).json({ error: 'Server error during password reset.' });
  }
});

// POST /api/auth/change-password - Change password for authenticated users
router.post('/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;
  const userRole = req.user.role;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  try {
    let user = null;

    if (userRole === 'doctor') {
      user = await db.get_('SELECT password FROM doctors WHERE id = ?', [userId]);
    } else {
      user = await db.get_('SELECT password FROM users WHERE id = ?', [userId]);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Verify current password
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update password
    if (userRole === 'doctor') {
      await db.run_(
        'UPDATE doctors SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
    } else {
      await db.run_(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
    }

    res.status(200).json({ message: 'Password changed successfully.' });

  } catch (err) {
    console.error('Error in change-password:', err);
    res.status(500).json({ error: 'Server error during password change.' });
  }
});

module.exports = router;
