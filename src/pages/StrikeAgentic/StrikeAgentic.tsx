import { Navbar } from '@/components/layout/Navbar'
import { MainSection } from '@/components/layout/MainSection'
import { StickyHeroBackground } from '@/components/layout/StickyHeroBackground'
import { AgenticHero } from '@/components/sections/agentic/AgenticHero'
import { AgenticLayer } from '@/components/sections/agentic/AgenticLayer'
import { AgenticLoop } from '@/components/sections/agentic/AgenticLoop'
import { AgenticAwareness } from '@/components/sections/agentic/AgenticAwareness'
import { AgenticOEMs } from '@/components/sections/agentic/AgenticOEMs'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'

export default function StrikeAgentic() {
  return (
    <StrikeLayout>
      <PageSEO
        path="/agentic"
        title="SR Agentic — Ephemeral intelligence for robots"
        metaDescription="SR Agentic builds task-shaped spatial understanding on the fly — and adapts the instant the world changes. Task-Conditioned Scene Graph navigation for the real world."
      />
      <div className="relative">
        <StickyHeroBackground />
        <div className="relative z-10 -mt-[100dvh]">
          <Navbar />
          <AgenticHero />
          <MainSection transparent>
            <AgenticLayer />
            <AgenticLoop />
            <div className="relative bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F7F7_48%,#FFFFFF_100%)]">
              <AgenticAwareness />
              <AgenticOEMs />
              <CTA variant="agentic" />
              <Footer />
            </div>
          </MainSection>
        </div>
      </div>
    </StrikeLayout>
  )
}
