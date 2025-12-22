import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import About from './pages/About/About'
import DataPlatform from './pages/DataPlatform/DataPlatform'
import UseCases from './pages/UseCases/UseCases'
import TechnologyStack from './pages/TechnologyStack/TechnologyStack'
// import Partners from './pages/Partners/Partners'
import LoadingScreen from './components/common/LoadingScreen/LoadingScreen'
import './App.css'

const DocsRedirect = () => {
  useEffect(() => {
    window.location.href = 'https://strikerobot.gitbook.io/strikerobot/'
  }, [])

  return null
}

const NotFound = () => {
  return (
    <div className="not-found">
      <h1>This strikerobot.ai page can’t be found</h1>
    </div>
  )
}

function App() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Add loading class to html
    if (isLoading) {
      document.documentElement.classList.add('loading')
    } else {
      document.documentElement.classList.remove('loading')
    }
  }, [isLoading])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  return (
    <>
      <LoadingScreen onComplete={handleLoadingComplete} />
      {!isLoading && (
        <>
          <Router>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/data-platform" element={<DataPlatform />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/technology-stack" element={<TechnologyStack />} />
              {/* <Route path="/partners" element={<Partners />} /> */}
              <Route path="/docs" element={<DocsRedirect />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Router>
        </>
      )}
    </>
  )
}

export default App
