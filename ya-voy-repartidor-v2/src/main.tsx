import { StrictMode } from "react"
import * as Sentry from "@sentry/react"
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, tracesSampleRate: 0.2, environment: import.meta.env.MODE })
}
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import App from "./App.tsx"
import ErrorBoundary from "./components/ErrorBoundary.tsx"
import "./index.css"

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!KEY) throw new Error("Missing Clerk key")

if (localStorage.getItem("ya_voy_dark") === "1") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ClerkProvider publishableKey={KEY}>
        <App />
      </ClerkProvider>
    </ErrorBoundary>
  </StrictMode>
)
