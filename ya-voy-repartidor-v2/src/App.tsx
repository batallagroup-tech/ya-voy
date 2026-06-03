import { useState, useEffect, lazy, Suspense } from "react"
import { useAuth, useUser, useClerk, AuthenticateWithRedirectCallback } from "@clerk/clerk-react"
import { AnimatePresence } from "motion/react"
import SplashScreen from "./components/SplashScreen"
import ServerWarmup from "./components/ServerWarmup"
import { syncUsuario, getSolicitudRepartidor, getRepartidor } from "./lib/api"
import { usePushNotifications } from "./hooks/usePushNotifications"

const Login       = lazy(() => import("./pages/Login"))
const DriverSetup = lazy(() => import("./pages/DriverSetup"))
const PendingReview = lazy(() => import("./pages/PendingReview"))
const Rejected    = lazy(() => import("./pages/Rejected"))
const Dashboard   = lazy(() => import("./pages/Dashboard"))

type AppStatus = "loading" | "setup" | "pendiente" | "rechazado" | "aprobado"

const Spinner = () => (
  <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
    <ServerWarmup />
    <div className="w-12 h-12 border-4 border-[#F107A3] border-t-transparent rounded-full animate-spin" />
  </div>
)

export default function App() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const { user } = useUser()
  usePushNotifications({ userId, getToken })
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
    <><ServerWarmup /><AnimatePresence><SplashScreen onDone={() => setShowSplash(false)} /></AnimatePresence></>
  )

  if (window.location.pathname === "/sso-callback") return <><ServerWarmup /><AuthenticateWithRedirectCallback /></>

  if (!isLoaded || !isSignedIn) return <Suspense fallback={<Spinner />}><ServerWarmup /><Login /></Suspense>

  if (status === "loading") return <Spinner />

  if (status === "pendiente") return <Suspense fallback={<Spinner />}><ServerWarmup /><PendingReview /></Suspense>

  if (status === "rechazado") return (
    <Suspense fallback={<Spinner />}>
      <ServerWarmup />
      <Rejected reason={solicitudData?.razon_rechazo}
        onReapply={() => { setIsReapplying(true); setStatus("setup") }} />
    </Suspense>
  )

  if (status === "aprobado") return (
    <Suspense fallback={<Spinner />}>
      <Dashboard repartidor={repartidorData} userId={userId!} user={user!} />
    </Suspense>
  )

  return (
    <Suspense fallback={<Spinner />}>
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
    </Suspense>
  )
}
