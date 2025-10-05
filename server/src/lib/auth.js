const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev-secret';

function signToken(user) {
  const payload = { sub: user.id, role: user.role, email: user.email };
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function requireRole(role) {
  return (req, res, next) => {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }
    try {
      const token = auth.slice(7);
      const payload = jwt.verify(token, SECRET);
      req.user = payload;
      if (role && payload.role !== role && payload.role !== 'Admin') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient role' } });
      }
      next();
    } catch (e) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    }
  };
}

module.exports = { signToken, requireRole };
