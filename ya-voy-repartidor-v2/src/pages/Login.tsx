import { useState } from "react"
import { useSignIn } from "@clerk/clerk-react"
import { motion, AnimatePresence } from "motion/react"
import { Bike, Mail, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react"

const GRAD = "linear-gradient(135deg, #7B2FF7 0%, #F107A3 50%, #FF6B00 100%)"
const ACCENT = "#F107A3"

type Mode = "selection" | "email" | "reset_request" | "reset_code"

export default function Login() {
  const { signIn, isLoaded } = useSignIn()
  const [mode, setMode] = useState<Mode>("selection")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [showNewPw, setShowNewPw] = useState(false)

  const go = (m: Mode) => { setMode(m); setError("") }

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true); setError("")
    try {
      const r = await signIn!.create({ identifier: email, password })
      if (r.status === "complete") window.location.reload()
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Correo o contraseña incorrectos.")
    } finally { setLoading(false) }
  }

  const handleGoogle = async () => {
    if (!isLoaded) return
    await signIn!.authenticateWithRedirect({
      strategy: "oauth_google",
      redirectUrl: window.location.origin + "/sso-callback",
      redirectUrlComplete: window.location.origin + "/",
    })
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !email) return
    setLoading(true); setError("")
    try {
      await signIn!.create({ strategy: "reset_password_email_code", identifier: email })
      go("reset_code")
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "No encontramos esa cuenta.")
    } finally { setLoading(false) }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !resetCode || !newPassword) return
    setLoading(true); setError("")
    try {
      const r = await signIn!.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code: resetCode,
        password: newPassword,
      } as any)
      if (r.status === "complete") window.location.reload()
    } catch (err: any) {
      setError(err.errors?.[0]?.message || "Código incorrecto o contraseña inválida.")
    } finally { setLoading(false) }
  }

  const input = "w-full px-4 py-4 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium"

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: GRAD }}>
      <AnimatePresence mode="wait">

        {mode === "selection" && (
          <motion.div key="sel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
                <Bike size={48} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-5xl font-black text-white tracking-widest">YA VOY</h1>
                <p className="text-white/80 text-sm font-bold tracking-[0.4em] uppercase mt-1">Repartidor</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3 mt-4">
              <button onClick={handleGoogle}
                className="w-full bg-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all"
                style={{ color: ACCENT }}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill={ACCENT} d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" /></svg>
                Continuar con Google
              </button>
              <button onClick={() => go("email")}
                className="w-full bg-white/20 backdrop-blur text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/30 hover:bg-white/30 transition-all">
                <Mail size={20} /> Continuar con correo
              </button>
            </div>
            <p className="text-white/30 text-xs text-center">
              Al continuar, aceptas nuestros{" "}
              <a href="https://batallagroup-tech.github.io/ya-voy/terminos" target="_blank" rel="noopener noreferrer" className="underline text-white/50">Términos y Condiciones</a>
              {" "}y la{" "}
              <a href="https://batallagroup-tech.github.io/ya-voy/privacidad" target="_blank" rel="noopener noreferrer" className="underline text-white/50">Política de Privacidad</a>.
            </p>
          </motion.div>
        )}

        {mode === "email" && (
          <motion.div key="email" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-xs">
            <button onClick={() => go("selection")} className="mb-6 text-white/70 flex items-center gap-2 hover:text-white">
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="text-2xl font-black text-white mb-6">Iniciar sesión</h2>
            <form onSubmit={handleEmail} className="flex flex-col gap-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="Correo electrónico" className={input} />
              <div className="relative">
                <input type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="Contraseña" className={input} />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all disabled:opacity-60 mt-2"
                style={{ color: ACCENT }}>
                {loading && <Loader2 className="animate-spin" size={20} />}
                Entrar
              </button>
              <button type="button" onClick={() => go("reset_request")}
                className="text-white/50 text-sm text-center hover:text-white/80 transition-colors">
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          </motion.div>
        )}

        {mode === "reset_request" && (
          <motion.div key="reset_req" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-xs">
            <button onClick={() => go("email")} className="mb-6 text-white/70 flex items-center gap-2 hover:text-white">
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="text-2xl font-black text-white mb-2">Recuperar contraseña</h2>
            <p className="text-white/60 text-sm mb-6">Te enviaremos un código a tu correo.</p>
            <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="Correo electrónico" className={input} />
              {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium">{error}</p>}
              <button type="submit" disabled={loading || !email}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all disabled:opacity-60"
                style={{ color: ACCENT }}>
                {loading && <Loader2 className="animate-spin" size={20} />}
                Enviar código
              </button>
            </form>
          </motion.div>
        )}

        {mode === "reset_code" && (
          <motion.div key="reset_code" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }} className="w-full max-w-xs">
            <button onClick={() => go("reset_request")} className="mb-6 text-white/70 flex items-center gap-2 hover:text-white">
              <ArrowLeft size={18} /> Volver
            </button>
            <h2 className="text-2xl font-black text-white mb-2">Nueva contraseña</h2>
            <p className="text-white/60 text-sm mb-6">Código enviado a <span className="text-white font-bold">{email}</span></p>
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <input type="text" value={resetCode} onChange={e => setResetCode(e.target.value)} required
                placeholder="Código de 6 dígitos" inputMode="numeric" maxLength={6}
                className={input + " tracking-[0.5em] text-center text-xl font-black"} />
              <div className="relative">
                <input type={showNewPw ? "text" : "password"} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required placeholder="Nueva contraseña" className={input} />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                  {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium">{error}</p>}
              <button type="submit" disabled={loading || !resetCode || !newPassword}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-90 transition-all disabled:opacity-60"
                style={{ color: ACCENT }}>
                {loading && <Loader2 className="animate-spin" size={20} />}
                Cambiar contraseña
              </button>
            </form>
          </motion.div>
        )}

      </AnimatePresence>
      <div id="clerk-captcha" className="hidden" />
      <p className="absolute bottom-6 text-white/30 text-xs">Desarrollado por Batalla Group</p>
    </div>
  )
}
