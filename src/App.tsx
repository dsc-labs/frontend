import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
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
import MindshareSubmit from './pages/MindshareSubmit/MindshareSubmit'
import MindshareEpoch2Leaderboard from './pages/MindshareEpoch2Leaderboard/MindshareEpoch2Leaderboard'
import LoadingScreen from './components/common/LoadingScreen/LoadingScreen'
import './App.css'

export const PrivyResetContext = createContext<() => void>(() => {})
export const usePrivyReset = () => useContext(PrivyResetContext)

function clearPrivyStorage() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('privy:') || key.startsWith('privy-')) {
      localStorage.removeItem(key)
    }
  })
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [privyKey, setPrivyKey] = useState(0)

  useEffect(() => {
    if (isLoading) {
      document.documentElement.classList.add('loading')
    } else {
      document.documentElement.classList.remove('loading')
    }
  }, [isLoading])

  const handleLoadingComplete = () => setIsLoading(false)

  const resetPrivy = useCallback(() => {
    clearPrivyStorage()
    setPrivyKey((k) => k + 1)
  }, [])

  return (
    <>
      <LoadingScreen onComplete={handleLoadingComplete} />
      {!isLoading && (
        <PrivyResetContext.Provider value={resetPrivy}>
          <PrivyProvider
            key={privyKey}
            appId={import.meta.env.VITE_PRIVY_APP_ID as string}
            config={{
              loginMethods: ['wallet'],
              appearance: { theme: 'dark' },
              embeddedWallets: { ethereum: { createOnLogin: 'off' } },
            }}
          >
            <Router>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/sr-platform" element={<HomeMain />} />
                <Route path="/test" element={<HomeMain />} />
                <Route path="/about" element={<About />} />
                <Route path="/data-platform" element={<DataPlatform />} />
                <Route path="/use-cases" element={<UseCases />} />
                <Route path="/technology-stack" element={<TechnologyStack />} />
                <Route path="/mindshare-challenge" element={<MindshareChallenge />} />
                <Route path="/epoch2" element={<MindshareEpoch2Leaderboard />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/models" element={<Models />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/mindshare-submit" element={<MindshareSubmit />} />
              </Routes>
            </Router>
          </PrivyProvider>
        </PrivyResetContext.Provider>
      )}
    </>
  )
}

export default App
