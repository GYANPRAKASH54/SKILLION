const express = require('express');
const { db } = require('../lib/db');
const { requireRole } = require('../lib/auth');

const router = express.Router();

function paginate(req) {
  const limit = Math.min(parseInt(req.query.limit || '20'), 100);
  const offset = parseInt(req.query.offset || '0');
  return { limit, offset };
}

// Public: list published courses
router.get('/', (req, res) => {
  const { limit, offset } = paginate(req);
  const items = db.prepare('SELECT * FROM courses WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?').all('published', limit + 1, offset);
  const next_offset = items.length > limit ? offset + limit : null;
  res.json({ items: items.slice(0, limit), next_offset });
});

// Public: course by id (only published)
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND status = ?').get(id, 'published');
  if (!course) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found' } });
  const lessons = db.prepare('SELECT id, title, order_index FROM lessons WHERE course_id = ? ORDER BY order_index ASC').all(id);
  res.json({ course, lessons });
});

// Creator: create course (draft)
router.post('/', requireRole('Creator'), (req, res) => {
  const userId = req.user.sub;
  const { title, description } = req.body || {};
  if (!title) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'title', message: 'Title is required' } });
  const info = db.prepare('INSERT INTO courses (creator_id, title, description, status) VALUES (?, ?, ?, ?)').run(userId, title, description || '', 'draft');
  res.json({ id: info.lastInsertRowid, title, description: description || '', status: 'draft' });
});

// Creator: update course (only own, not published)
router.put('/:id', requireRole('Creator'), (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user.sub;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course || course.creator_id !== userId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found' } });
  if (course.status === 'published') return res.status(400).json({ error: { code: 'INVALID', message: 'Published course cannot be edited' } });
  const { title, description } = req.body || {};
  db.prepare('UPDATE courses SET title = COALESCE(?, title), description = COALESCE(?, description) WHERE id = ?').run(title, description, id);
  const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  res.json(updated);
});

// Creator: add lesson with unique order, auto transcript
router.post('/:id/lessons', requireRole('Creator'), (req, res) => {
  const courseId = Number(req.params.id);
  const userId = req.user.sub;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course || course.creator_id !== userId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found' } });
  const { title, content, order_index } = req.body || {};
  if (!title) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'title', message: 'Title is required' } });
  if (order_index === undefined) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'order_index', message: 'Order is required' } });
  try {
    const transcript = generateTranscript(content || '');
    const info = db.prepare('INSERT INTO lessons (course_id, title, content, transcript, order_index) VALUES (?, ?, ?, ?, ?)')
      .run(courseId, title, content || '', transcript, order_index);
    res.json({ id: info.lastInsertRowid, title, order_index });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) {
      return res.status(400).json({ error: { code: 'INVALID', field: 'order_index', message: 'Order must be unique per course' } });
    }
    throw e;
  }
});

function generateTranscript(content) {
  // Simple auto-transcript: extract sentences and keywords
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  const sentences = normalized.split(/(?<=[.!?])\s+/).slice(0, 5);
  const words = normalized.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const freq = new Map();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  const keywords = [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([w])=>w);
  return `Summary: ${sentences.join(' ')}\nKeywords: ${keywords.join(', ')}`;
}

// Creator: submit for review
router.post('/:id/submit', requireRole('Creator'), (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user.sub;
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!course || course.creator_id !== userId) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found' } });
  db.prepare('UPDATE courses SET status = ? WHERE id = ?').run('submitted', id);
  res.json({ ok: true });
});

module.exports = router;
