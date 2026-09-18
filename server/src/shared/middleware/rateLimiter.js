const DEFAULT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_MAX = 30;

const createRateLimiter = (options = {}) => {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const hits = new Map();

  return (req, res, next) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${ip}:${email}`;
    const now = Date.now();

    let record = hits.get(key);
    if (!record || record.resetAt <= now) {
      record = { count: 0, resetAt: now + windowMs };
    }

    record.count += 1;
    hits.set(key, record);

    if (record.count > max) {
      res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
      return res.status(429).json({
        status: 429,
        message: 'Too many login attempts. Please try again later.',
      });
    }

    return next();
  };
};

export default createRateLimiter;