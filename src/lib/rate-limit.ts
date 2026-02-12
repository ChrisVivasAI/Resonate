const requestMap = new Map<string, { count: number; resetAt: number }>()

// Cleanup old entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  requestMap.forEach((entry, key) => {
    if (now > entry.resetAt) {
      requestMap.delete(key)
    }
  })
}

export function checkRateLimit(
  userId: string,
  action: string,
  maxPerMinute: number
): { allowed: boolean } {
  cleanup()

  const key = `${userId}:${action}`
  const now = Date.now()
  const entry = requestMap.get(key)

  if (!entry || now > entry.resetAt) {
    requestMap.set(key, { count: 1, resetAt: now + 60_000 })
    return { allowed: true }
  }

  entry.count++
  if (entry.count > maxPerMinute) {
    return { allowed: false }
  }

  return { allowed: true }
}
