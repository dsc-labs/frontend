import { Navbar } from '@/components/layout/Navbar'
import { MainSection } from '@/components/layout/MainSection'
import { StickyHeroBackground } from '@/components/layout/StickyHeroBackground'
import { AboutHero } from '@/components/sections/about/AboutHero'
import { AboutMission } from '@/components/sections/about/AboutMission'
import { AboutPartners } from '@/components/sections/about/AboutPartners'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO, DEFAULT_SEO_DESCRIPTION } from '../../components/common/PageSEO/PageSEO'

export default function StrikeAbout() {
  return (
    <StrikeLayout>
      <PageSEO
        path="/"
        title="About StrikeRobot — The intelligence layer for physical AI"
        metaDescription={DEFAULT_SEO_DESCRIPTION}
      />
      <Navbar />
      <div className="relative">
        <StickyHeroBackground />
        <div className="relative z-10 -mt-[100dvh]">
          <AboutHero />
          <MainSection transparent>
            <AboutMission />
            <AboutPartners />
            <CTA variant="about" />
            <Footer />
          </MainSection>
        </div>
      </div>
    </StrikeLayout>
  )
}
