const express = require('express');
const { db } = require('../lib/db');
const { requireRole } = require('../lib/auth');

const router = express.Router();

// Apply to become a creator
router.post('/apply', requireRole('Learner'), (req, res) => {
  const userId = req.user.sub;
  const { bio } = req.body || {};
  const existing = db.prepare('SELECT id FROM creator_applications WHERE user_id = ? AND status = ?').get(userId, 'pending');
  if (existing) return res.status(400).json({ error: { code: 'ALREADY_EXISTS', message: 'Application already pending' } });
  db.prepare('INSERT INTO creator_applications (user_id, bio, status) VALUES (?, ?, ?)').run(userId, bio || '', 'pending');
  res.json({ ok: true });
});

// Creator dashboard: list own courses
router.get('/dashboard', requireRole('Creator'), (req, res) => {
  const userId = req.user.sub;
  const courses = db.prepare('SELECT * FROM courses WHERE creator_id = ? ORDER BY id DESC').all(userId);
  res.json({ items: courses, next_offset: null });
});

module.exports = router;
