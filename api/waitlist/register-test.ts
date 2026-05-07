import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleWaitlistRegister } from '../../lib/waitlistRegister'

/** `/test`: 10,000 $SR or 5+ $VVV; signups do not accrue waitlist points. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await handleWaitlistRegister(req, res, {
    allowVvvMinimumEligible: true,
    accrueWaitlistPoints: false,
  })
}
