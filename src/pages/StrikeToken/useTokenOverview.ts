import { useEffect, useState } from 'react'
import { createTokenOverviewLoader, type TokenLoad } from './tokenOverviewLoader'

export type { TokenLoad } from './tokenOverviewLoader'

export function useTokenOverview() {
  const [load, setLoad] = useState<TokenLoad>({ state: 'loading', data: null })
  const [generation, setGeneration] = useState(0)
  useEffect(() => {
    const loader = createTokenOverviewLoader()
    void loader.load(setLoad)
    return () => loader.dispose()
  }, [generation])

  return { ...load, retry: () => setGeneration((value) => value + 1) }
}
