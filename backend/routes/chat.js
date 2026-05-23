const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');
const { toInt, sameId } = require('../utils/chatIds');

router.use(authMiddleware);

// GET /api/chat/conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = toInt(req.user.id);
    const userRole = req.user.role;

    const messages = await db.all_(
      `SELECT * FROM chat_messages
       WHERE (sender_id = ? AND sender_role = ?) OR (receiver_id = ? AND receiver_role = ?)
       ORDER BY created_at DESC`,
      [userId, userRole, userId, userRole]
    );

    const convMap = new Map();
    for (const msg of messages) {
      const isSender = sameId(msg.sender_id, userId) && msg.sender_role === userRole;
      const otherId = isSender ? msg.receiver_id : msg.sender_id;
      const otherRole = isSender ? msg.receiver_role : msg.sender_role;
      const key = `${otherRole}:${otherId}`;

      if (!convMap.has(key)) {
        convMap.set(key, {
          other_user_id: toInt(otherId),
          other_user_role: otherRole,
          last_message: msg.message,
          last_message_time: msg.created_at,
          unread_count: 0,
        });
      }
    }

    const unreadRows = await db.all_(
      `SELECT sender_id, sender_role, COUNT(*)::int AS cnt
       FROM chat_messages
       WHERE receiver_id = ? AND receiver_role = ? AND is_read = FALSE
       GROUP BY sender_id, sender_role`,
      [userId, userRole]
    );
    for (const row of unreadRows) {
      const key = `${row.sender_role}:${row.sender_id}`;
      if (convMap.has(key)) {
        convMap.get(key).unread_count = Number(row.cnt) || 0;
      }
    }

    const conversations = [];
    for (const [, conv] of convMap) {
      let name = 'Unknown';
      try {
        if (conv.other_user_role === 'patient') {
          const u = await db.get_('SELECT name FROM users WHERE id = ?', [conv.other_user_id]);
          if (u) name = u.name;
        } else if (conv.other_user_role === 'doctor') {
          const d = await db.get_('SELECT name FROM doctors WHERE id = ?', [conv.other_user_id]);
          if (d) name = d.name;
        } else if (conv.other_user_role === 'admin') {
          const a = await db.get_("SELECT name FROM users WHERE id = ? AND role = 'admin'", [conv.other_user_id]);
          if (a) name = a.name;
        }
      } catch (_) { /* name lookup optional */ }
      conversations.push({ ...conv, other_user_name: name });
    }

    conversations.sort((a, b) => new Date(b.last_message_time) - new Date(a.last_message_time));
    res.json(conversations);
  } catch (err) {
    console.error('Chat conversations error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const userId = toInt(req.user.id);
    const userRole = req.user.role;
    let users = [];

    if (userRole === 'patient') {
      const doctors = await db.all_('SELECT id, name, department, specialization FROM doctors ORDER BY name');
      users = doctors.map((d) => ({
        id: toInt(d.id),
        name: d.name,
        role: 'doctor',
        department: d.department,
        specialization: d.specialization,
      }));
    } else if (userRole === 'doctor') {
      const patients = await db.all_("SELECT id, name, email FROM users WHERE role = 'patient' ORDER BY name");
      const admins = await db.all_("SELECT id, name FROM users WHERE role = 'admin' ORDER BY name");
      const doctors = await db.all_('SELECT id, name, department, specialization FROM doctors WHERE id != ? ORDER BY name', [userId]);
      users = [
        ...patients.map((p) => ({ id: toInt(p.id), name: p.name, role: 'patient', email: p.email })),
        ...admins.map((a) => ({ id: toInt(a.id), name: a.name, role: 'admin' })),
        ...doctors.map((d) => ({
          id: toInt(d.id),
          name: d.name,
          role: 'doctor',
          department: d.department,
          specialization: d.specialization,
        })),
      ];
    } else if (userRole === 'admin') {
      const doctors = await db.all_('SELECT id, name, department, specialization FROM doctors ORDER BY name');
      users = doctors.map((d) => ({
        id: toInt(d.id),
        name: d.name,
        role: 'doctor',
        department: d.department,
        specialization: d.specialization,
      }));
    }

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.get('/messages/:otherUserId', async (req, res) => {
  try {
    const myId = toInt(req.user.id);
    const myRole = req.user.role;
    const otherId = toInt(req.params.otherUserId);
    const { search, date, otherRole } = req.query;

    if (!otherId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    let actualOtherRole = otherRole;
    if (!actualOtherRole) {
      const adminCheck = await db.get_("SELECT 1 FROM users WHERE id = ? AND role = 'admin'", [otherId]);
      if (adminCheck) actualOtherRole = 'admin';
      else {
        const doctorCheck = await db.get_('SELECT 1 FROM doctors WHERE id = ?', [otherId]);
        if (doctorCheck) actualOtherRole = 'doctor';
        else {
          const patientCheck = await db.get_("SELECT 1 FROM users WHERE id = ? AND role = 'patient'", [otherId]);
          actualOtherRole = patientCheck ? 'patient' : 'unknown';
        }
      }
    }

    if (myRole === 'doctor' && actualOtherRole === 'doctor') {
      const otherDoctor = await db.get_('SELECT id FROM doctors WHERE id = ?', [otherId]);
      if (!otherDoctor) {
        return res.status(404).json({ error: 'Doctor not found.' });
      }
    }

    let query = `
      SELECT * FROM chat_messages
      WHERE ((sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?)
          OR (sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?))
    `;
    const params = [myId, myRole, otherId, actualOtherRole, otherId, actualOtherRole, myId, myRole];

    if (search) {
      query += ' AND message LIKE ?';
      params.push(`%${search}%`);
    }
    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    }
    query += ' ORDER BY created_at ASC';

    const messages = await db.all_(query, params);

    await db.run_(
      `UPDATE chat_messages SET is_read = TRUE
       WHERE sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ? AND is_read = FALSE`,
      [otherId, actualOtherRole, myId, myRole]
    );

    res.json(messages);
  } catch (err) {
    console.error('Chat messages error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

router.post('/send', async (req, res) => {
  try {
    const receiverId = toInt(req.body.receiverId);
    const receiverRole = req.body.receiverRole;
    const message = (req.body.message || '').trim();
    const senderId = toInt(req.user.id);
    const senderRole = req.user.role;

    if (!receiverId || !receiverRole || !message) {
      return res.status(400).json({ error: 'Receiver, receiver role, and message are required.' });
    }

    if (senderRole === 'patient' && receiverRole !== 'doctor') {
      return res.status(403).json({ error: 'Patients can only message doctors.' });
    }
    if (senderRole === 'doctor' && !['patient', 'admin', 'doctor'].includes(receiverRole)) {
      return res.status(403).json({ error: 'Doctors can message patients, admins, and other doctors.' });
    }
    if (senderRole === 'admin' && receiverRole !== 'doctor') {
      return res.status(403).json({ error: 'Admins can only message doctors.' });
    }

    const result = await db.run_(
      `INSERT INTO chat_messages (sender_id, sender_role, receiver_id, receiver_role, message)
       VALUES (?, ?, ?, ?, ?)`,
      [senderId, senderRole, receiverId, receiverRole, message]
    );

    if (!result.lastInsertRowid) {
      console.error('Send message: insert did not return id');
      return res.status(500).json({ error: 'Message was not saved. Please try again.' });
    }

    const newMessage = await db.get_('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
    if (!newMessage) {
      return res.status(500).json({ error: 'Message saved but could not be loaded.' });
    }

    res.status(201).json({ message: 'Message sent!', chatMessage: newMessage });
  } catch (err) {
    console.error('Send message error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

router.put('/mark-read/:senderId', async (req, res) => {
  try {
    const myId = toInt(req.user.id);
    const myRole = req.user.role;
    const senderId = toInt(req.params.senderId);
    const senderRole = req.body.senderRole;

    if (!senderId || !senderRole) {
      return res.status(400).json({ error: 'senderId and senderRole are required.' });
    }

    await db.run_(
      `UPDATE chat_messages SET is_read = TRUE
       WHERE sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ? AND is_read = FALSE`,
      [senderId, senderRole, myId, myRole]
    );
    res.json({ message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

router.get('/unread-count', async (req, res) => {
  try {
    const result = await db.get_(
      `SELECT COUNT(*)::int AS count FROM chat_messages
       WHERE receiver_id = ? AND receiver_role = ? AND is_read = FALSE`,
      [toInt(req.user.id), req.user.role]
    );
    res.json({ count: result ? Number(result.count) : 0 });
  } catch (err) {
    console.error('Unread count error:', err.message);
    res.status(500).json({ error: 'Failed to get unread count.' });
  }
});

router.delete('/conversation/:otherUserId', async (req, res) => {
  try {
    const myId = toInt(req.user.id);
    const myRole = req.user.role;
    const otherId = toInt(req.params.otherUserId);
    let actualOtherRole = req.query.otherRole || '';

    if (!otherId) {
      return res.status(400).json({ error: 'Invalid user id.' });
    }

    if (!actualOtherRole) {
      const adminCheck = await db.get_("SELECT 1 FROM users WHERE id = ? AND role = 'admin'", [otherId]);
      if (adminCheck) actualOtherRole = 'admin';
      else {
        const d = await db.get_('SELECT 1 FROM doctors WHERE id = ?', [otherId]);
        if (d) actualOtherRole = 'doctor';
        else {
          const p = await db.get_("SELECT 1 FROM users WHERE id = ? AND role = 'patient'", [otherId]);
          actualOtherRole = p ? 'patient' : 'unknown';
        }
      }
    }

    await db.run_(
      `DELETE FROM chat_messages
       WHERE ((sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?)
           OR (sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ?))`,
      [myId, myRole, otherId, actualOtherRole, otherId, actualOtherRole, myId, myRole]
    );

    res.json({ message: 'Conversation deleted.' });
  } catch (err) {
    console.error('Delete conversation error:', err.message);
    res.status(500).json({ error: 'Failed to delete conversation.' });
  }
});

module.exports = router;
