const express = require('express');
const { db } = require('../lib/db');
const { requireRole } = require('../lib/auth');

const router = express.Router();

// List pending creator applications
router.get('/review/creators', requireRole('Admin'), (req, res) => {
  const items = db.prepare('SELECT ca.id, u.email, ca.bio, ca.status, ca.created_at FROM creator_applications ca JOIN users u ON u.id = ca.user_id WHERE ca.status = ? ORDER BY ca.id DESC').all('pending');
  res.json({ items, next_offset: null });
});

// Approve creator application -> upgrade user role to Creator
router.post('/review/creators/:id/approve', requireRole('Admin'), (req, res) => {
  const id = Number(req.params.id);
  const app = db.prepare('SELECT * FROM creator_applications WHERE id = ? AND status = ?').get(id, 'pending');
  if (!app) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Application not found' } });
  db.prepare('UPDATE creator_applications SET status = ? WHERE id = ?').run('approved', id);
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run('Creator', app.user_id);
  res.json({ ok: true });
});

// List courses pending review
router.get('/review/courses', requireRole('Admin'), (req, res) => {
  const items = db.prepare('SELECT * FROM courses WHERE status = ? ORDER BY id DESC').all('submitted');
  res.json({ items, next_offset: null });
});

// Approve/publish course
router.post('/review/courses/:id/approve', requireRole('Admin'), (req, res) => {
  const id = Number(req.params.id);
  const exists = db.prepare('SELECT id FROM courses WHERE id = ? AND status = ?').get(id, 'submitted');
  if (!exists) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found or not submitted' } });
  db.prepare('UPDATE courses SET status = ? WHERE id = ?').run('published', id);
  res.json({ ok: true });
});

module.exports = router;
