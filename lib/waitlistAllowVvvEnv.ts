/**
 * Whether waitlist should use the optional “10k $SR or 5+ $VVV” gate (UI + /waitlist/register).
 * Any non-empty value counts as **on** except explicit disables: 0, false, no, off.
 * So `1`, `true`, or even a mistaken `5` all enable the feature.
 */
export function envEnablesWaitlistVvvMinimum(value: string | undefined): boolean {
  if (value == null || !String(value).trim()) return false
  const v = String(value).trim().toLowerCase()
  return v !== '0' && v !== 'false' && v !== 'no' && v !== 'off'
}
