const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const { db } = require('./lib/db');
const { errorHandler, notFoundHandler } = require('./lib/errors');
const authRoutes = require('./routes/auth');
const creatorRoutes = require('./routes/creator');
const courseRoutes = require('./routes/courses');
const adminRoutes = require('./routes/admin');
const learnerRoutes = require('./routes/learner');
const metaRoutes = require('./routes/meta');
const lessonDetailRoute = express.Router();
lessonDetailRoute.get('/lesson/:id', (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Lesson not found' } });
  res.json(row);
});

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));

// Rate limit: 60 req/min per user (by user id or IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const auth = req.headers['authorization'];
    if (auth && auth.startsWith('Bearer ')) {
      try {
        const token = auth.slice(7);
        const payload = JSON.parse(Buffer.from(token.split('.')[1] || '', 'base64').toString() || '{}');
        if (payload && payload.sub) return `user:${payload.sub}`;
      } catch (_) {}
    }
    return `ip:${ipKeyGenerator(req.ip)}`;
  },
  handler: (req, res) => {
    res.status(429).json({ error: { code: 'RATE_LIMIT' } });
  }
});
app.use(limiter);

// Idempotency storage (in-memory for demo)
const idempotencyStore = new Map();
app.use((req, res, next) => {
  if (req.method === 'POST') {
    const key = req.headers['idempotency-key'];
    if (key) {
      if (idempotencyStore.has(key)) {
        const prev = idempotencyStore.get(key);
        return res.status(prev.status).set(prev.headers).send(prev.body);
      }
      // Capture send to store response once
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        const snapshot = { status: res.statusCode || 200, headers: {}, body };
        idempotencyStore.set(key, snapshot);
        return originalJson(body);
      };
    }
  }
  next();
});

app.use('/api', metaRoutes);
app.use('/api', lessonDetailRoute);
app.use('/api/auth', authRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/learn', learnerRoutes);

// Root well-known manifest (outside /api)
app.get('/.well-known/hackathon.json', (req, res) => {
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

app.use(notFoundHandler);
app.use(errorHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
