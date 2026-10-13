type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20000;
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size >= MAX_BUCKETS) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) return false;
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) { buckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  return ++bucket.count <= limit;
}
export function getClientIp(req: Request): string {
  // Trust forwarding headers only when the deployment's proxy overwrites them.
  if (process.env.TRUST_PROXY === 'true' || process.env.VERCEL === '1') return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
  return 'unknown';
}
export async function allowRequest(req: Request, key: string, limit: number, windowMs = 60000): Promise<boolean> {
  const url = process.env.RATE_LIMIT_REST_URL; const token = process.env.RATE_LIMIT_REST_TOKEN;
  if (url && token) {
    try {
      // Redis REST pipeline: expiry is conditional, so a window does not slide on each request.
      const res = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify([['INCR', key], ['PEXPIRE', key, String(windowMs), 'NX']]), signal: AbortSignal.timeout(2000) });
      if (!res.ok) return false;
      const result = await res.json();
      return Array.isArray(result) && typeof result[0]?.result === 'number' && result[0].result <= limit;
    } catch { return false; }
  }
  if (process.env.NODE_ENV === 'production') return false;
  return rateLimit(key, limit, windowMs);
}
