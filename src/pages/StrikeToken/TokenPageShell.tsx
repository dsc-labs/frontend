import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Footer } from '@/components/sections/Footer'
import { Navbar } from '@/components/layout/Navbar'
import { ROUTES } from '@/lib/navigate'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import './StrikeToken.css'

type TokenPageShellProps = {
  activeTab: 'dashboard' | 'burns'
  children: ReactNode
}

export function TokenPageShell({ activeTab, children }: TokenPageShellProps) {
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
        <div className="strike-token__subnav-wrap">
          <div className="strike-token__container strike-token__subnav">
            <nav aria-label="Token navigation">
              <Link
                to={ROUTES.token}
                className={isDashboard ? 'is-active' : undefined}
                aria-current={isDashboard ? 'page' : undefined}
              >
                Token Dashboard
              </Link>
              <Link
                to={ROUTES.tokenBurns}
                className={!isDashboard ? 'is-active' : undefined}
                aria-current={!isDashboard ? 'page' : undefined}
              >
                Burn Tracker
              </Link>
            </nav>
            <span className="strike-token__status">Preview data</span>
          </div>
        </div>
        {children}
      </main>
      <Footer />
    </StrikeLayout>
  )
}
