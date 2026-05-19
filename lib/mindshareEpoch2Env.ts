/**
 * Vite loads `.env` into `loadEnv()` but not `process.env`. Copy keys used by the Epoch 2
 * leaderboard builder so `lib/mindshareEpoch2LeaderboardBuild` reads the same values as on Vercel.
 */
export function applyMindshareEpoch2Env(fromLoadedEnv: Record<string, string>): void {
  const keys = [
    'MINDSHARE_EPOCH2_DATA_DIR',
    'MINDSHARE_EPOCH2_DAILY_STATE_PATH',
    'MINDSHARE_EPOCH2_LEADERBOARD_SNAPSHOT_PATH',
    'MINDSHARE_EPOCH2_DAILY_SNAPSHOT_LOG_PATH',
    'MINDSHARE_SUBMISSIONS_CSV_PATH',
    'TWITTER_BEARER_TOKEN',
    'MINDSHARE_EPOCH2_DEFAULT_QUALITY',
    'MINDSHARE_EPOCH2_CACHE_TTL_MS',
    'MINDSHARE_EPOCH2_METRICS_CACHE_PATH',
    'WAITLIST_STATE_PATH',
    'MINDSHARE_EPOCH2_MIN_SR_TOKENS',
    'MINDSHARE_EPOCH2_SKIP_WAITLIST_SR_GATE',
    'MINDSHARE_EPOCH2_SR_GATE_RPC_CONCURRENCY',
    'BASE_RPC_URL',
    'VITE_BASE_RPC_URL',
    'MINDSHARE_EPOCH2_SR_SNAPSHOT_LOG_PATH',
    'MINDSHARE_EPOCH2_SR_SNAPSHOT_RPC_CONCURRENCY',
    'MINDSHARE_EPOCH2_SR_ELIGIBLE_WALLETS_PATH',
    'MINDSHARE_EPOCH2_SR_GATE_LIVE_FALLBACK',
  ] as const
  for (const k of keys) {
    const v = fromLoadedEnv[k]?.trim()
    if (v && !process.env[k]?.trim()) process.env[k] = v
  }
}
