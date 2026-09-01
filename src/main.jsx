import { ThemeProvider } from './context/ThemeContext'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './pwaInstallState'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <OfflineBanner />
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}