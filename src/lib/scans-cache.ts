/**
 * localStorage cache for scans data. Show cached immediately while fresh loads.
 */
const CACHE_KEY_PREFIX = 'taxsnapper:scans:';
const CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

export function getCachedScans(userId: string | null): unknown[] | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const key = `${CACHE_KEY_PREFIX}${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: unknown[]; ts: number };
    if (Date.now() - ts > CACHE_MAX_AGE_MS) return null;
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export function setCachedScans(userId: string | null, scans: unknown[]): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const key = `${CACHE_KEY_PREFIX}${userId}`;
    localStorage.setItem(key, JSON.stringify({ data: scans, ts: Date.now() }));
  } catch {
    // Quota exceeded or disabled
  }
}
