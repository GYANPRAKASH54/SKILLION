function errorResponse(res, code, message, field) {
  const body = { error: { code, message } };
  if (field) body.error.field = field;
  return res.status(400).json(body);
}

function authRequired(res) {
  return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
}

function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err);
  if (res.headersSent) return;
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
}

module.exports = { errorResponse, authRequired, notFoundHandler, errorHandler };
