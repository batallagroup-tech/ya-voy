import { useState, useEffect } from "react"
import { useAuth, useUser, useClerk, AuthenticateWithRedirectCallback } from "@clerk/clerk-react"
import { AnimatePresence } from "motion/react"
import SplashScreen from "./components/SplashScreen"
import Login from "./pages/Login"
import DriverSetup from "./pages/DriverSetup"
import PendingReview from "./pages/PendingReview"
import Rejected from "./pages/Rejected"
import Dashboard from "./pages/Dashboard"
import { syncUsuario, getSolicitudRepartidor, getRepartidor } from "./lib/api"

type AppStatus = "loading" | "setup" | "pendiente" | "rechazado" | "aprobado"

export default function App() {
  if (window.location.pathname === "/sso-callback") return <AuthenticateWithRedirectCallback />

  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [showSplash, setShowSplash] = useState(true)
  const [status, setStatus] = useState<AppStatus>("loading")
  const [solicitudData, setSolicitudData] = useState<any>(null)
  const [repartidorData, setRepartidorData] = useState<any>(null)
  const [isReapplying, setIsReapplying] = useState(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !user) return
    const init = async () => {
      try {
        await syncUsuario({
          userId, rol: "repartidor",
          email: user.primaryEmailAddress?.emailAddress ?? "",
          nombre: user.fullName ?? "",
          fotoUrl: user.imageUrl ?? "",
        })
      } catch {}
      try {
        const rep: any = await getRepartidor(userId).catch(() => null)
        if (rep) { setRepartidorData(rep); setStatus("aprobado"); return }
        const sol: any = await getSolicitudRepartidor(userId).catch(() => null)
        if (sol) { setSolicitudData(sol); setStatus(sol.status) }
        else { setStatus("setup") }
      } catch { setStatus("setup") }
    }
    init()
  }, [isLoaded, isSignedIn, userId, user])

  if (showSplash) return (
    <AnimatePresence><SplashScreen onDone={() => setShowSplash(false)} /></AnimatePresence>
  )

  if (!isLoaded || !isSignedIn) return <Login />

  if (status === "loading") return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#F107A3] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (status === "pendiente") return <PendingReview />

  if (status === "rechazado") return (
    <Rejected reason={solicitudData?.razon_rechazo}
      onReapply={() => { setIsReapplying(true); setStatus("setup") }} />
  )

  if (status === "aprobado") return (
    <Dashboard repartidor={repartidorData} userId={userId!} user={user!} />
  )

  return (
    <div className="relative">
      <button onClick={() => signOut()}
        className="fixed top-4 right-4 z-50 bg-white border border-slate-200 text-slate-500 text-sm px-4 py-2 rounded-lg shadow-sm">
        Cerrar sesión
      </button>
      <DriverSetup
        userId={userId!}
        userEmail={user?.primaryEmailAddress?.emailAddress ?? ""}
        initialData={isReapplying ? solicitudData : null}
        onSubmit={() => setStatus("pendiente")}
        onCancel={isReapplying ? () => { setIsReapplying(false); setStatus("rechazado") } : undefined}
      />
    </div>
  )
}

