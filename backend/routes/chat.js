const express = require('express');
const router = express.Router();
const db = require('../db/database');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/chat/conversations - Get list of conversations for current user
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get all messages involving this user (as sender or receiver)
    // Each user should only see conversations with users they've directly communicated with
    const messages = await db.all_(
      `SELECT * FROM chat_messages
       WHERE (sender_id = ? AND sender_role = ?) OR (receiver_id = ? AND receiver_role = ?)
       ORDER BY created_at DESC`,
      [userId, userRole, userId, userRole]
    );

    // Build unique conversation partners map
    const convMap = new Map();
    for (const msg of messages) {
      const isSender = (msg.sender_id === userId && msg.sender_role === userRole);
      const otherId   = isSender ? msg.receiver_id   : msg.sender_id;
      const otherRole = isSender ? msg.receiver_role  : msg.sender_role;
      const key = otherRole + ':' + otherId;

      if (!convMap.has(key)) {
        convMap.set(key, {
          other_user_id:   otherId,
          other_user_role: otherRole,
          last_message:      msg.message,
          last_message_time: msg.created_at,
          unread_count: 0,
        });
      }
    }

    // Count unread per conversation
    const unreadRows = await db.all_(
      `SELECT sender_id, sender_role, COUNT(*) as cnt
       FROM chat_messages
       WHERE receiver_id = ? AND receiver_role = ? AND is_read = 0
       GROUP BY sender_id, sender_role`,
      [userId, userRole]
    );
    for (const row of unreadRows) {
      const key = row.sender_role + ':' + row.sender_id;
      if (convMap.has(key)) {
        convMap.get(key).unread_count = row.cnt;
      }
    }

    // Resolve names
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
          const a = await db.get_('SELECT name FROM admins WHERE id = ?', [conv.other_user_id]);
          if (a) name = a.name;
        }
      } catch (_) {}
      conversations.push(Object.assign({}, conv, { other_user_name: name }));
    }

    // Sort by last message time desc
    conversations.sort(function(a, b) { return new Date(b.last_message_time) - new Date(a.last_message_time); });

    res.json(conversations);
  } catch (err) {
    console.error('Chat conversations error:', err.message);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

// GET /api/chat/users - Get list of users that can be chatted with
router.get('/users', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    let users = [];

    if (userRole === 'patient') {
      // Patients can ONLY chat with doctors
      const doctors = await db.all_('SELECT id, name, department, specialization FROM doctors ORDER BY name');
      users = doctors.map(function(d) { return { id: d.id, name: d.name, role: 'doctor', department: d.department, specialization: d.specialization }; });

    } else if (userRole === 'doctor') {
      // Doctors can communicate with patients, admins, AND other doctors
      const patients = await db.all_("SELECT id, name, email FROM users WHERE role = 'patient' ORDER BY name");
      const admins   = await db.all_('SELECT id, name FROM admins ORDER BY name');
      const doctors  = await db.all_('SELECT id, name, department, specialization FROM doctors WHERE id != ? ORDER BY name', [userId]);
      users = [
        ...patients.map(function(p) { return { id: p.id, name: p.name, role: 'patient', email: p.email }; }),
        ...admins.map(function(a) { return { id: a.id, name: a.name, role: 'admin' }; }),
        ...doctors.map(function(d) { return { id: d.id, name: d.name, role: 'doctor', department: d.department, specialization: d.specialization }; }),
      ];

    } else if (userRole === 'admin') {
      // Admins can ONLY communicate with doctors
      const doctors = await db.all_('SELECT id, name, department, specialization FROM doctors ORDER BY name');
      users = doctors.map(function(d) { return { id: d.id, name: d.name, role: 'doctor', department: d.department, specialization: d.specialization }; });
    }

    res.json(users);
  } catch (err) {
    console.error('Get users error:', err.message);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

// GET /api/chat/messages/:otherUserId - Get messages with a specific user
router.get('/messages/:otherUserId', async (req, res) => {
  try {
    const myId   = req.user.id;
    const myRole = req.user.role;
    const otherId = parseInt(req.params.otherUserId, 10);
    const search   = req.query.search;
    const date     = req.query.date;
    const otherRole = req.query.otherRole;

    // Determine the other user role if not provided
    let actualOtherRole = otherRole;
    if (!actualOtherRole) {
      const patientCheck = await db.get_('SELECT 1 FROM users WHERE id = ?', [otherId]);
      if (patientCheck) {
        actualOtherRole = 'patient';
      } else {
        const doctorCheck = await db.get_('SELECT 1 FROM doctors WHERE id = ?', [otherId]);
        if (doctorCheck) {
          actualOtherRole = 'doctor';
        } else {
          const adminCheck = await db.get_('SELECT 1 FROM admins WHERE id = ?', [otherId]);
          actualOtherRole = adminCheck ? 'admin' : 'unknown';
        }
      }
    }

    // CRITICAL SECURITY: Ensure proper message access control
    // - Doctors can only view messages with specific users they're involved with
    // - No doctor should see another doctor's private conversations with patients
    // The query already enforces this by checking (sender_id AND receiver_id match)
    // so we only need to verify they're not trying to access someone else's role
    
    // For doctor-to-doctor conversations, ensure both parties match
    if (myRole === 'doctor' && actualOtherRole === 'doctor') {
      // This is allowed - verify it's a valid doctor
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

    if (search) { query += ' AND message LIKE ?'; params.push('%' + search + '%'); }
    if (date)   { query += ' AND DATE(created_at) = ?'; params.push(date); }
    query += ' ORDER BY created_at ASC';

    const messages = await db.all_(query, params);

    await db.run_(
      `UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ? AND is_read = 0`,
      [otherId, actualOtherRole, myId, myRole]
    );

    res.json(messages);
  } catch (err) {
    console.error('Chat messages error:', err.message);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

// POST /api/chat/send - Send a message
router.post('/send', async (req, res) => {
  try {
    const receiverId   = req.body.receiverId;
    const receiverRole = req.body.receiverRole;
    const message      = req.body.message;
    const senderId   = req.user.id;
    const senderRole = req.user.role;

    if (!receiverId || !message || !message.trim()) {
      return res.status(400).json({ error: 'Receiver and message are required.' });
    }

    // Enforce communication rules
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
      `INSERT INTO chat_messages (sender_id, sender_role, receiver_id, receiver_role, message) VALUES (?, ?, ?, ?, ?)`,
      [senderId, senderRole, receiverId, receiverRole, message]
    );

    const newMessage = await db.get_('SELECT * FROM chat_messages WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ message: 'Message sent!', chatMessage: newMessage });
  } catch (err) {
    console.error('Send message error:', err.message);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

// PUT /api/chat/mark-read/:senderId
router.put('/mark-read/:senderId', async (req, res) => {
  try {
    const myId = req.user.id;
    const myRole = req.user.role;
    const senderId = parseInt(req.params.senderId, 10);
    const senderRole = req.body.senderRole;

    // Security: Validate that senderRole is provided to prevent accidental data leaks
    if (!senderRole) {
      return res.status(400).json({ error: 'senderRole is required.' });
    }

    await db.run_(
      `UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND sender_role = ? AND receiver_id = ? AND receiver_role = ? AND is_read = 0`,
      [senderId, senderRole, myId, myRole]
    );
    res.json({ message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err.message);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
});

// GET /api/chat/unread-count
router.get('/unread-count', async (req, res) => {
  try {
    const result = await db.get_(
      `SELECT COUNT(*) as count FROM chat_messages WHERE receiver_id = ? AND receiver_role = ? AND is_read = 0`,
      [req.user.id, req.user.role]
    );
    res.json({ count: result ? result.count : 0 });
  } catch (err) {
    console.error('Unread count error:', err.message);
    res.status(500).json({ error: 'Failed to get unread count.' });
  }
});

// DELETE /api/chat/conversation/:otherUserId - Delete all messages in a conversation
router.delete('/conversation/:otherUserId', async (req, res) => {
  try {
    const myId     = req.user.id;
    const myRole   = req.user.role;
    const otherId  = parseInt(req.params.otherUserId, 10);
    const otherRole = req.query.otherRole || '';

    // Determine other role if not provided
    let actualOtherRole = otherRole;
    if (!actualOtherRole) {
      const p = await db.get_('SELECT 1 FROM users WHERE id = ?', [otherId]);
      if (p) { actualOtherRole = 'patient'; }
      else {
        const d = await db.get_('SELECT 1 FROM doctors WHERE id = ?', [otherId]);
        if (d) { actualOtherRole = 'doctor'; }
        else { actualOtherRole = 'admin'; }
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