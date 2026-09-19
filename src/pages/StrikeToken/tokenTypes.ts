export type TokenDataSource = 'preview' | 'live' | 'stale'
export type TokenRange = '30d' | '90d' | '1y' | 'all'
export type BurnRange = '7d' | '30d' | '90d' | '1y' | 'all'
export type BurnType = 'protocol-buyback' | 'scheduled-reduction'

export interface TokenMetadata {
  readonly name: string
  readonly symbol: string
  readonly network: string
  readonly standard: string
  readonly decimals: number
  readonly contractAddress: string
  readonly verificationStatus: string
}

export interface TokenSupplySnapshot {
  readonly initialSupply: string
  readonly currentSupply: string
  readonly circulatingSupply: string
  readonly circulatingPercentage: string
  readonly totalBurned: string
  readonly burnedPercentage: string
  readonly lockedSupply: string
  readonly otherSupply: string
}

export interface TokenDistributionItem {
  readonly id: 'circulating' | 'locked' | 'burned' | 'other'
  readonly label: string
  readonly amount: string
  readonly percentage: string
}

export interface TokenSupplyPoint {
  readonly timestamp: string
  readonly label: string
  readonly currentSupply: string
  readonly circulatingSupply: string
  readonly burnedSupply: string
}

export interface TokenOverview {
  readonly token: TokenMetadata
  readonly supply: TokenSupplySnapshot
  readonly distribution: readonly TokenDistributionItem[]
  readonly history: readonly TokenSupplyPoint[]
  readonly indexedBlock: number | null
  readonly updatedAt: string | null
  readonly source: TokenDataSource
}

export interface BurnSummary {
  readonly totalBurned: string
  readonly burnedPercentage: string
  readonly burned24Hours: string
  readonly burned7Days: string
  readonly burned30Days: string
  readonly transactionCount: number
}

export interface BurnEvent {
  readonly id: string
  readonly timestamp: string
  readonly amount: string
  readonly type: BurnType
  readonly transactionHash: string
  readonly transactionUrl: string | null
  readonly status: 'preview' | 'verified'
}

export interface BurnActivityPoint {
  readonly timestamp: string
  readonly label: string
  readonly cumulativeBurned: string
  readonly amountBurned: string
}

export interface BurnPageData {
  readonly summary: BurnSummary
  readonly events: readonly BurnEvent[]
  readonly activity: readonly BurnActivityPoint[]
  readonly nextCursor: string | null
  readonly indexedBlock: number | null
  readonly updatedAt: string | null
  readonly source: TokenDataSource
}
