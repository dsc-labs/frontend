export function isAlchemyRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /compute units per second|rate limit|too many requests|429/i.test(msg)
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Retry RPC calls when Alchemy (or similar) returns throughput / rate-limit errors. */
export async function withRpcRetry<T>(
  fn: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = Math.max(1, options?.maxAttempts ?? 6)
  const baseDelayMs = Math.max(200, options?.baseDelayMs ?? 1500)
  let last: unknown
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      last = err
      if (!isAlchemyRateLimitError(err) || attempt >= maxAttempts - 1) throw err
      await sleepMs(baseDelayMs * (attempt + 1))
    }
  }
  throw last
}
