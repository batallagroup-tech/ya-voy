import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { setStatusBarDark } from "../lib/statusBar";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag, Mail, ArrowLeft, Eye, EyeOff, Loader2, User, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import { GRAD } from "../lib/constants";

import { Browser } from "@capacitor/browser";
import { App as CapApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type Mode = "selection" | "email_login" | "email_register" | "reset_request";

function mapError(message: string): string {
  if (message.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (message.includes("User already registered")) return "Este correo ya está registrado. Inicia sesión.";
  if (message.includes("Password should be at least")) return "La contraseña debe tener al menos 6 caracteres.";
  if (message.includes("Unable to validate email")) return "Correo electrónico no válido.";
  return message || "Ocurrió un error. Inténtalo de nuevo.";
}

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("selection");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setStatusBarDark();
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener("appUrlOpen", async (data) => {
        if (data.url.includes("login-callback") || data.url.includes("access_token") || data.url.includes("code=")) {
          try {
            await Browser.close();
          } catch {}
          const urlObj = new URL(data.url);
          // Buscar code para PKCE (flujo por defecto de Supabase v2)
          const code = urlObj.searchParams.get("code");
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            window.location.reload();
            return;
          }
          // Fallback para Implicit Grant (si estuviera activado)
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            window.location.reload();
          }
        }
      });
    }
  }, []);

  const go = (m: Mode) => {
    setMode(m);
    setError("");
    setResetSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      window.location.reload();
    } catch (err: any) {
      setError(mapError(err.message || err.error_description || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError("Por favor ingresa tu nombre completo.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPw) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: nombre.trim(),
          },
        },
      });
      if (err) throw err;
      window.location.reload();
    } catch (err: any) {
      setError(mapError(err.message || err.error_description || ""));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      if (Capacitor.isNativePlatform()) {
        const { data, error: err } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: "yavoy://login-callback",
            skipBrowserRedirect: true,
          },
        });
        if (err) throw err;
        if (data?.url) {
          await Browser.open({ url: data.url });
        }
      } else {
        const { error: err } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (err) throw err;
      }
    } catch (err: any) {
      setError("No se pudo iniciar sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (err) throw err;
      setResetSent(true);
    } catch (err: any) {
      setError(mapError(err.message || "No encontramos una cuenta con este correo."));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/15 text-white placeholder-white/50 border border-white/25 outline-none focus:border-white focus:bg-white/20 transition-all font-medium text-sm backdrop-blur-md";

  return (
    <div 
      className="min-h-[100dvh] flex flex-col items-center justify-between p-6 relative overflow-hidden" 
      style={{ 
        background: GRAD, 
        paddingTop: "max(1.5rem, calc(env(safe-area-inset-top) + 16px))", 
        paddingBottom: "max(2.5rem, calc(env(safe-area-inset-bottom) + 28px))" 
      }}>
      
      {/* Decorative ambient glowing orbs */}
      <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pink-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-rose-500/30 blur-3xl pointer-events-none" />

      {/* Header spacer */}
      <div className="w-full flex justify-between items-center z-10">
        {mode !== "selection" ? (
          <button 
            onClick={() => go("selection")} 
            className="flex items-center gap-2 text-white/80 hover:text-white bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-xs font-bold transition-all">
            <ArrowLeft size={14} /> Volver
          </button>
        ) : <div />}
        <div className="flex items-center gap-1 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
          <span className="text-[10px] font-black text-white uppercase tracking-wider">Ya Voy v1.2</span>
        </div>
      </div>

      <div className="w-full max-w-sm flex-1 flex flex-col justify-center items-center z-10 my-auto py-4">
        <AnimatePresence mode="wait">

          {/* MODO 1: SELECCIÓN INICIAL */}
          {mode === "selection" && (
            <motion.div 
              key="sel" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }} 
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center gap-6 w-full">
              
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/30 relative group">
                  <div className="absolute inset-0 bg-white/10 rounded-3xl animate-pulse" />
                  <ShoppingBag size={46} className="text-white drop-shadow-md" />
                </div>
                <div className="text-center mt-1">
                  <h1 className="text-4xl font-black text-white tracking-wider drop-shadow-sm">¡YA VOY!</h1>
                  <p className="text-white/80 text-xs font-bold tracking-[0.3em] uppercase mt-0.5">Delivery Inteligente</p>
                </div>
              </div>

              <div className="w-full flex flex-col gap-3 mt-4">
                <button 
                  onClick={handleGoogle} 
                  disabled={loading}
                  className="w-full bg-white text-rose-700 font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-60 text-sm">
                  {loading ? <Loader2 className="animate-spin text-rose-700" size={20} /> : (
                    <svg width="20" height="20" viewBox="0 0 48 48">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    </svg>
                  )}
                  Continuar con Google
                </button>

                <div className="grid grid-cols-2 gap-2.5">
                  <button 
                    onClick={() => go("email_login")}
                    className="w-full bg-white/15 backdrop-blur-md text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-white/25 hover:bg-white/25 active:scale-[0.99] transition-all text-xs">
                    <Mail size={16} /> Iniciar Sesión
                  </button>
                  <button 
                    onClick={() => go("email_register")}
                    className="w-full bg-rose-900/40 backdrop-blur-md text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-rose-400/40 hover:bg-rose-900/60 active:scale-[0.99] transition-all text-xs">
                    <User size={16} /> Crear Cuenta
                  </button>
                </div>
              </div>

              {error && (
                <div className="w-full bg-red-500/25 border border-red-400/40 backdrop-blur-md rounded-2xl px-4 py-3 text-xs font-bold text-white text-center">
                  {error}
                </div>
              )}
            </motion.div>
          )}

          {/* MODO 2: INICIAR SESIÓN CON EMAIL */}
          {mode === "email_login" && (
            <motion.div 
              key="login" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3 }} 
              className="w-full">
              
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-black text-white">¡Hola de nuevo!</h2>
                <p className="text-white/70 text-xs mt-1">Ingresa a tu cuenta para ordenar tu comida favorita</p>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                    placeholder="Correo electrónico" 
                    className={inputClass} 
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    placeholder="Contraseña" 
                    className={inputClass + " pr-11"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(!showPw)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/30 border border-red-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-white text-center">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !email || !password}
                  className="w-full bg-white text-rose-700 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-60 text-sm mt-1">
                  {loading && <Loader2 className="animate-spin text-rose-700" size={18} />}
                  Iniciar Sesión
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button 
                    type="button" 
                    onClick={() => go("reset_request")}
                    className="text-white/70 hover:text-white font-medium">
                    ¿Olvidaste tu contraseña?
                  </button>
                  <button 
                    type="button" 
                    onClick={() => go("email_register")}
                    className="text-white font-black underline">
                    Crear cuenta
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* MODO 3: REGISTRO / CREAR CUENTA */}
          {mode === "email_register" && (
            <motion.div 
              key="register" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3 }} 
              className="w-full">
              
              <div className="mb-4 text-center">
                <h2 className="text-2xl font-black text-white">Crea tu cuenta</h2>
                <p className="text-white/70 text-xs mt-0.5">Únete y disfruta de entregas rápidas y seguras</p>
              </div>

              <form onSubmit={handleRegister} className="flex flex-col gap-2.5">
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type="text" 
                    value={nombre} 
                    onChange={e => setNombre(e.target.value)} 
                    required
                    placeholder="Nombre completo" 
                    className={inputClass} 
                  />
                </div>

                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required
                    placeholder="Correo electrónico" 
                    className={inputClass} 
                  />
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={password}
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    placeholder="Contraseña (mínimo 6 caracteres)" 
                    className={inputClass + " pr-11"} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPw(!showPw)} 
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                  <input 
                    type={showPw ? "text" : "password"} 
                    value={confirmPw}
                    onChange={e => setConfirmPw(e.target.value)} 
                    required 
                    placeholder="Confirmar contraseña" 
                    className={inputClass} 
                  />
                </div>

                {error && (
                  <div className="bg-red-500/30 border border-red-400/40 rounded-xl px-4 py-2 text-xs font-bold text-white text-center">
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !nombre || !email || !password || !confirmPw}
                  className="w-full bg-white text-rose-700 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-60 text-sm mt-1">
                  {loading && <Loader2 className="animate-spin text-rose-700" size={18} />}
                  Registrarme y Comenzar
                </button>

                <div className="text-center text-xs pt-1">
                  <span className="text-white/70">¿Ya tienes cuenta? </span>
                  <button 
                    type="button" 
                    onClick={() => go("email_login")}
                    className="text-white font-black underline">
                    Inicia Sesión
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* MODO 4: RECUPERAR CONTRASEÑA */}
          {mode === "reset_request" && (
            <motion.div 
              key="reset_req" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} 
              transition={{ duration: 0.3 }} 
              className="w-full">
              
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-black text-white">Recuperar cuenta</h2>
                <p className="text-white/70 text-xs mt-1">Te enviaremos un enlace a tu correo para restablecer tu contraseña</p>
              </div>

              {resetSent ? (
                <div className="flex flex-col items-center gap-4 bg-white/15 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center">
                  <CheckCircle2 size={44} className="text-green-300" />
                  <p className="text-white text-xs leading-relaxed font-medium">
                    Revisa tu bandeja de entrada en <span className="font-black text-white">{email}</span>. Si no lo ves en unos segundos, revisa tu carpeta de spam.
                  </p>
                  <button 
                    onClick={() => go("email_login")}
                    className="w-full bg-white text-rose-700 font-black py-3.5 rounded-2xl flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all text-xs mt-2">
                    Volver a Iniciar Sesión
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRequestReset} className="flex flex-col gap-3">
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                    <input 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      required
                      placeholder="Correo de tu cuenta" 
                      className={inputClass} 
                    />
                  </div>

                  {error && (
                    <div className="bg-red-500/30 border border-red-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-white text-center">
                      {error}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={loading || !email}
                    className="w-full bg-white text-rose-700 font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:bg-slate-50 active:scale-[0.99] transition-all disabled:opacity-60 text-sm mt-1">
                    {loading && <Loader2 className="animate-spin text-rose-700" size={18} />}
                    Enviar enlace de recuperación
                  </button>
                </form>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer info */}
      <div className="text-center z-10 pb-4 pt-2">
        <p className="text-white/60 text-[11px]">
          Al continuar aceptas nuestros{" "}
          <a href="https://batallagroup-tech.github.io/ya-voy/terminos" target="_blank" rel="noopener noreferrer" className="underline text-white/90 font-bold">Términos</a>
          {" "}y{" "}
          <a href="https://batallagroup-tech.github.io/ya-voy/privacidad" target="_blank" rel="noopener noreferrer" className="underline text-white/90 font-bold">Privacidad</a>.
        </p>
        <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1.5">Batalla Group</p>
      </div>
    </div>
  );
}
