import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCredential } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { auth } from "../lib/firebase";
import { setStatusBarDark } from "../lib/statusBar";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag, Mail, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { GRAD } from "../lib/constants";

type Mode = "selection" | "email" | "reset_request";

function mapError(code: string): string {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential": return "Correo o contraseña incorrectos.";
    case "auth/invalid-email": return "Correo inválido.";
    case "auth/too-many-requests": return "Demasiados intentos. Intenta más tarde.";
    case "auth/network-request-failed": return "Error de conexión. Verifica tu internet.";
    default: return "Error al iniciar sesión.";
  }
}

async function googleSignIn() {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
    const result = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(auth, credential);
  }
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("selection");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => { setStatusBarDark(); }, []);
  const go = (m: Mode) => { setMode(m); setError(""); setResetSent(false); };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.reload();
    } catch (err: any) {
      setError(mapError(err.code));
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    setLoading(true); setError("");
    try {
      await googleSignIn();
      window.location.reload();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user" && err.code !== "auth/cancelled-popup-request") {
        setError("No se pudo iniciar sesión con Google.");
      }
    } finally { setLoading(false); }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError("");
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
    } catch (err: any) {
      setError(mapError(err.code) || "No encontramos esa cuenta.");
    } finally { setLoading(false); }
  };

  const input = "w-full px-4 py-4 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium";

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6" style={{ background: GRAD, paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
      <AnimatePresence mode="wait">

        {mode === "selection" && (
          <motion.div key="sel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center shadow-2xl">
                <ShoppingBag size={48} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-5xl font-black text-white tracking-widest">YA VOY</h1>
                <p className="text-white/80 text-sm font-bold tracking-[0.4em] uppercase mt-1">Delivery Inteligente</p>
              </div>
            </div>
            <div className="w-full flex flex-col gap-3 mt-4">
              <button onClick={handleGoogle} disabled={loading}
                className="w-full bg-white text-purple-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-purple-50 transition-all disabled:opacity-60">
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#6C3CE1" d="M44.5 20H24v8.5h11.8C34.7 33.9 29.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" /></svg>
                )}
                Continuar con Google
              </button>
              <button onClick={() => go("email")}
                className="w-full bg-white/20 backdrop-blur text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/30 hover:bg-white/30 transition-all">
                <Mail size={20} /> Continuar con correo
              </button>
            </div>
            {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium text-center">{error}</p>}
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
                className="w-full bg-white text-purple-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-purple-50 transition-all disabled:opacity-60 mt-2">
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
            {resetSent ? (
              <div className="flex flex-col gap-4">
                <p className="text-white/80 text-sm">Revisá tu correo <span className="text-white font-bold">{email}</span> — te enviamos un link para restablecer tu contraseña.</p>
                <button onClick={() => go("selection")}
                  className="w-full bg-white text-purple-600 font-black py-4 rounded-2xl flex items-center justify-center shadow-xl hover:bg-purple-50 transition-all">
                  Volver al inicio
                </button>
              </div>
            ) : (
              <>
                <p className="text-white/60 text-sm mb-6">Te enviaremos un link a tu correo.</p>
                <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="Correo electrónico" className={input} />
                  {error && <p className="text-white bg-white/20 rounded-xl px-4 py-3 text-sm font-medium">{error}</p>}
                  <button type="submit" disabled={loading || !email}
                    className="w-full bg-white text-purple-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-purple-50 transition-all disabled:opacity-60">
                    {loading && <Loader2 className="animate-spin" size={20} />}
                    Enviar link
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
      <p className="absolute bottom-6 text-white/30 text-xs">Desarrollado por Batalla Group</p>
    </div>
  );
}
