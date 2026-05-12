/**
 * Vite loads `.env` into `loadEnv()` but not `process.env`. Copy keys used by the Epoch 2
 * leaderboard builder so `lib/mindshareEpoch2LeaderboardBuild` reads the same values as on Vercel.
 */
export function applyMindshareEpoch2Env(fromLoadedEnv: Record<string, string>): void {
  const keys = [
    'MINDSHARE_SUBMISSIONS_CSV_PATH',
    'TWITTER_BEARER_TOKEN',
    'MINDSHARE_EPOCH2_DEFAULT_QUALITY',
    'MINDSHARE_EPOCH2_CACHE_TTL_MS',
    'MINDSHARE_EPOCH2_METRICS_CACHE_PATH',
  ] as const
  for (const k of keys) {
    const v = fromLoadedEnv[k]?.trim()
    if (v && !process.env[k]?.trim()) process.env[k] = v
  }
}
