import { createContext, useCallback, useContext } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { PrivyProvider } from '@privy-io/react-auth'
import StrikeLanding from './pages/StrikeLanding/StrikeLanding'
import StrikeAbout from './pages/StrikeAbout/StrikeAbout'
import StrikeAgentic from './pages/StrikeAgentic/StrikeAgentic'
import HomeMain from './pages/HomeMain/HomeMain'
import MindshareChallenge from './pages/MindshareChallenge/MindshareChallenge'
import MindshareSubmit from './pages/MindshareSubmit/MindshareSubmit'
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
  const resetPrivy = useCallback(() => {
    clearPrivyStorage()
    window.location.reload()
  }, [])

  return (
    <PrivyResetContext.Provider value={resetPrivy}>
      <PrivyProvider
        appId={import.meta.env.VITE_PRIVY_APP_ID as string}
        config={{
          loginMethods: ['wallet'],
          appearance: { theme: 'dark' },
          embeddedWallets: { ethereum: { createOnLogin: 'off' } },
        }}
      >
        <Router>
          <Routes>
            <Route path="/" element={<StrikeAbout />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="/sr-platform" element={<StrikeLanding />} />
            <Route path="/agentic" element={<StrikeAgentic />} />
            <Route path="/join" element={<HomeMain />} />
            <Route path="/test" element={<HomeMain />} />
            <Route path="/mindshare-challenge" element={<MindshareChallenge />} />
            <Route path="/mindshare-submit" element={<MindshareSubmit />} />
            <Route path="/epoch3-preview" element={<Navigate to="/mindshare-challenge" replace />} />
            <Route path="/mindshare-leaderboard" element={<Navigate to="/mindshare-challenge" replace />} />
            <Route path="/leaderboard" element={<Navigate to="/mindshare-challenge" replace />} />
            <Route path="/data-platform" element={<Navigate to="/sr-platform" replace />} />
            <Route path="/use-cases" element={<Navigate to="/sr-platform" replace />} />
            <Route path="/technology-stack" element={<Navigate to="/sr-platform" replace />} />
            <Route path="/partners" element={<Navigate to="/" replace />} />
            <Route path="/models" element={<Navigate to="/sr-platform" replace />} />
          </Routes>
        </Router>
      </PrivyProvider>
    </PrivyResetContext.Provider>
  )
}

export default App
