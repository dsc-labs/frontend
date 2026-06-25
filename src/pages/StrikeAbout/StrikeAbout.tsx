import { Navbar } from '@/components/layout/Navbar'
import { MainSection } from '@/components/layout/MainSection'
import { StickyHeroBackground } from '@/components/layout/StickyHeroBackground'
import { AboutHero } from '@/components/sections/about/AboutHero'
import { AboutMission } from '@/components/sections/about/AboutMission'
import { AboutPartners } from '@/components/sections/about/AboutPartners'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'

export default function StrikeAbout() {
  return (
    <StrikeLayout>
      <PageSEO
        path="/"
        title="About StrikeRobot — The intelligence layer for physical AI"
        metaDescription="StrikeRobot builds the intelligence and infrastructure layer for the next generation of physical AI — giving robots the spatial understanding to act in the real world."
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
