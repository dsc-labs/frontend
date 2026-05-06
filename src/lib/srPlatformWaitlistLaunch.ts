/**
 * SR Platform waitlist unlocks at a fixed instant (browser compares with Date.now()).
 * Thu 7 May 2026, 08:00 in GMT+7 (UTC+7).
 */
const LAUNCH_AT_MS = Date.parse('2026-05-07T08:00:00+07:00')

export function getSrPlatformWaitlistLaunchMs(): number {
  return LAUNCH_AT_MS
}

export function isSrPlatformWaitlistLive(nowMs: number = Date.now()): boolean {
  return Number.isFinite(LAUNCH_AT_MS) && nowMs >= LAUNCH_AT_MS
}
