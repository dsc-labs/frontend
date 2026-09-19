import type { ReactNode } from 'react'
import { Footer } from '@/components/sections/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { ROUTES } from '@/lib/navigate'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import './StrikeToken.css'

type TokenPageShellProps = {
  activeTab: 'dashboard' | 'burns'
  hero: ReactNode
  children: ReactNode
}

export function TokenPageShell({ activeTab, hero, children }: TokenPageShellProps) {
  const isDashboard = activeTab === 'dashboard'

  return (
    <StrikeLayout>
      <PageSEO
        path={isDashboard ? ROUTES.token : ROUTES.tokenBurns}
        title={isDashboard ? 'Strike Robot Token Dashboard' : 'Strike Robot Token Burn Tracker'}
        metaDescription={
          isDashboard
            ? 'Explore the SR token supply, distribution, and verified Base contract information.'
            : 'Review SR token burn activity and the on-chain verification model.'
        }
      />
      <Navbar />
      <main className="strike-token">
        <div className="strike-token__hero-band">
          <div className="strike-token__container">{hero}</div>
        </div>
        {children}
      </main>
      <Footer />
    </StrikeLayout>
  )
}
