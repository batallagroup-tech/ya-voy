import { StrictMode } from 'react'
import * as Sentry from "@sentry/react"
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.2, environment: import.meta.env.MODE })
}
import { createRoot } from 'react-dom/client'
import './lib/firebase' // inicializar Firebase
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

if (localStorage.getItem("ya_voy_dark") === "1") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
)
