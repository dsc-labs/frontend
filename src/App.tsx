import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home/Home'
import HomeMain from './pages/HomeMain/HomeMain'
import About from './pages/About/About'
import DataPlatform from './pages/DataPlatform/DataPlatform'
import UseCases from './pages/UseCases/UseCases'
import TechnologyStack from './pages/TechnologyStack/TechnologyStack'
import MindshareChallenge from './pages/MindshareChallenge/MindshareChallenge'
import Partners from './pages/Partners/Partners'
import Models from './pages/Models/Models'
import Leaderboard from './pages/Leaderboard/Leaderboard'
import LoadingScreen from './components/common/LoadingScreen/LoadingScreen'
import './App.css'

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
              <Route path="/sr-platform" element={<HomeMain />} />
              <Route path="/about" element={<About />} />
              <Route path="/data-platform" element={<DataPlatform />} />
              <Route path="/use-cases" element={<UseCases />} />
              <Route path="/technology-stack" element={<TechnologyStack />} />
              <Route path="/mindshare-challenge" element={<MindshareChallenge />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/models" element={<Models />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
            </Routes>
          </Router>
        </>
      )}
    </>
  )
}

export default App
