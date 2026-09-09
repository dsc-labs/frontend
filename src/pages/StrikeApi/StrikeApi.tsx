import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/sections/Footer'
import { StrikeLayout } from '../../strike/StrikeLayout'
import { PageSEO } from '../../components/common/PageSEO/PageSEO'
import './StrikeApi.css'

export default function StrikeApi() {
  return (
    <StrikeLayout>
      <PageSEO
        path="/api"
        title="SR Platform Developer API"
        metaDescription="Build physical AI workflows with the SR Platform Developer API."
      />
      <Navbar />
      <main className="strike-api">
        <h1>Bring SR Platform into your own workflow.</h1>
      </main>
      <Footer />
    </StrikeLayout>
  )
}
