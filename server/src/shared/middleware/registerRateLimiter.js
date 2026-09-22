// Separate from the login limiter: 5 registrations per IP per hour.
const WINDOW_MS = 60 * 60 * 1000;
const MAX = 5;

const hits = new Map();

const registerRateLimiter = (req, res, next) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  let record = hits.get(ip);
  if (!record || record.resetAt <= now) {
    record = { count: 0, resetAt: now + WINDOW_MS };
  }

  record.count += 1;
  hits.set(ip, record);

  if (record.count > MAX) {
    res.set('Retry-After', String(Math.ceil((record.resetAt - now) / 1000)));
    return res.status(429).json({
      status: 429,
      message: 'Too many registration attempts. Please try again later.',
    });
  }

  return next();
};

export default registerRateLimiter;
