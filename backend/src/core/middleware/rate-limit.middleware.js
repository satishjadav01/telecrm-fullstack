const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 120;
const buckets = new Map();

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of buckets.entries()) {
    if (now > value.resetAt) buckets.delete(key);
  }
}, WINDOW_MS).unref();

module.exports = (req, res, next) => {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const bucket = buckets.get(key) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > MAX_REQUESTS) {
    return res.status(429).json({ message: 'Too many requests, please retry shortly' });
  }

  return next();
};
