import { Navbar } from '@/components/layout/Navbar'
import { MainSection } from '@/components/layout/MainSection'
import { StickyHeroBackground } from '@/components/layout/StickyHeroBackground'
import { Hero } from '@/components/sections/Hero'
import { Features } from '@/components/sections/Features'
import { HowItWorks } from '@/components/sections/HowItWorks'
import { Pricing } from '@/components/sections/Pricing'
import { CTA } from '@/components/sections/CTA'
import { Footer } from '@/components/sections/Footer'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO, DEFAULT_SEO_DESCRIPTION } from '../../components/common/PageSEO/PageSEO'
import { SITE_NAME } from '@/lib/constants'

export default function StrikeLanding() {
  return (
    <StrikeLayout>
      <PageSEO
        path="/sr-platform"
        title={`${SITE_NAME} — The 3D spatial creation platform for intelligent robots`}
        metaDescription={DEFAULT_SEO_DESCRIPTION}
      />
      <Navbar />
      <div className="relative">
        <StickyHeroBackground />
        <div className="relative z-10 -mt-[100dvh]">
          <Hero />
          <Features />
        </div>
      </div>
      <MainSection>
        <HowItWorks />
        <Pricing />
        <CTA />
        <Footer />
      </MainSection>
    </StrikeLayout>
  )
}
