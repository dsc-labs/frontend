/**
 * Read persisted contributor identity (browser localStorage).
 * X comes from OAuth; wallet from last successful EIP-1193 connection on this site.
 */

import { readStoredWalletAddress } from './walletStorage'
import { readStoredXProfile, type XOAuthStoredProfile } from './xOAuthClient'

export type ContributorIdentity = {
  x: XOAuthStoredProfile | null
  walletAddress: string | null
}

export function readContributorIdentity(): ContributorIdentity {
  return {
    x: readStoredXProfile(),
    walletAddress: readStoredWalletAddress(),
  }
}
