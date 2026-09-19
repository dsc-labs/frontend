export interface TokenOverviewResponse {
  status: 'live'
  source: 'onchain'
  token: {
    name: string
    symbol: string
    network: 'Base Mainnet'
    standard: 'ERC-20'
    decimals: number
    contractAddress: string
  }
  supply: {
    totalSupply: string
    initialSupply: null
    circulatingSupply: null
    lockedSupply: null
    totalBurned: null
  }
  indexedBlock: number
  updatedAt: string
}
