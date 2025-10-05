const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../lib/db');
const { signToken } = require('../lib/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'email', message: 'Email is required' } });
  if (!password) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'password', message: 'Password is required' } });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(400).json({ error: { code: 'ALREADY_EXISTS', message: 'Email already registered' } });
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)').run(email, password_hash, 'Learner');
  const user = { id: info.lastInsertRowid, email, role: 'Learner' };
  const token = signToken(user);
  res.json({ user, token });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'email', message: 'Email is required' } });
  if (!password) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'password', message: 'Password is required' } });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  const token = signToken(user);
  res.json({ user: { id: user.id, email: user.email, role: user.role }, token });
});

module.exports = router;
