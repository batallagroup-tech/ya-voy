import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ClerkProvider } from "@clerk/clerk-react"
import "./index.css"
import App from "./App.tsx"

const KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!KEY) throw new Error("Missing Clerk key")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={KEY}>
      <App />
    </ClerkProvider>
  </StrictMode>
)

