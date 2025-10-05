const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ ok: true });
});

router.get('/_meta', (req, res) => {
  res.json({ name: 'MicroCourses', version: '1.0.0' });
});

router.get('/.well-known/hackathon.json', (req, res) => {
  res.json({
    name: 'MicroCourses',
    auth: { type: 'jwt', endpoints: ['/api/auth/register', '/api/auth/login'] },
    notes: {
      pagination: 'limit & offset with next_offset',
      idempotency: 'POST accepts Idempotency-Key',
      rate_limits: '60 req/min/user',
    }
  });
});

module.exports = router;
