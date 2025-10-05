const express = require('express');
const { db } = require('../lib/db');
const { requireRole } = require('../lib/auth');
const crypto = require('crypto');

const router = express.Router();

// Enroll in a published course
router.post('/enroll', requireRole('Learner'), (req, res) => {
  const userId = req.user.sub;
  const { course_id } = req.body || {};
  if (!course_id) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'course_id', message: 'course_id is required' } });
  const course = db.prepare('SELECT * FROM courses WHERE id = ? AND status = ?').get(course_id, 'published');
  if (!course) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Course not found' } });
  try {
    db.prepare('INSERT INTO enrollments (user_id, course_id) VALUES (?, ?)').run(userId, course_id);
  } catch (e) {
    // ignore unique constraint
  }
  res.json({ ok: true });
});

// Complete a lesson
router.post('/complete', requireRole('Learner'), (req, res) => {
  const userId = req.user.sub;
  const { lesson_id } = req.body || {};
  if (!lesson_id) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'lesson_id', message: 'lesson_id is required' } });
  const lesson = db.prepare('SELECT * FROM lessons WHERE id = ?').get(lesson_id);
  if (!lesson) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lesson not found' } });
  db.prepare('INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP) ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed=1, completed_at=CURRENT_TIMESTAMP')
    .run(userId, lesson_id);
  res.json({ ok: true });
});

// Progress for a course
router.get('/progress/:courseId', requireRole('Learner'), (req, res) => {
  const userId = req.user.sub;
  const courseId = Number(req.params.courseId);
  const total = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ?').get(courseId).c;
  const completed = db.prepare('SELECT COUNT(*) as c FROM lesson_progress WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ?) AND completed = 1').get(userId, courseId).c;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  res.json({ total_lessons: total, completed_lessons: completed, percent });
});

// Issue certificate when course 100% complete
router.post('/certificate', requireRole('Learner'), (req, res) => {
  const userId = req.user.sub;
  const { course_id } = req.body || {};
  if (!course_id) return res.status(400).json({ error: { code: 'FIELD_REQUIRED', field: 'course_id', message: 'course_id is required' } });
  const total = db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id = ?').get(course_id).c;
  const completed = db.prepare('SELECT COUNT(*) as c FROM lesson_progress WHERE user_id = ? AND lesson_id IN (SELECT id FROM lessons WHERE course_id = ?) AND completed = 1').get(userId, course_id).c;
  if (total === 0 || completed < total) return res.status(400).json({ error: { code: 'INVALID', message: 'Course not completed 100%' } });
  let cert = db.prepare('SELECT * FROM certificates WHERE user_id = ? AND course_id = ?').get(userId, course_id);
  if (!cert) {
    const serial_hash = crypto.createHash('sha256').update(`${userId}:${course_id}:${Date.now()}`).digest('hex').slice(0, 16);
    const info = db.prepare('INSERT INTO certificates (user_id, course_id, serial_hash) VALUES (?, ?, ?)').run(userId, course_id, serial_hash);
    cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(info.lastInsertRowid);
  }
  res.json({ certificate: cert });
});

module.exports = router;
