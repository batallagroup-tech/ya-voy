import { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { auth } from '../lib/firebase';
import { setStatusBarDark } from '../lib/statusBar';
import { motion, AnimatePresence } from 'motion/react';
import { Utensils, Mail, Eye, EyeOff, ArrowLeft, Loader2, Store, Sparkles, User } from 'lucide-react';

const GRAD = 'linear-gradient(135deg, #FF6B00 0%, #FF3D00 50%, #9C1458 100%)';
const ACCENT = '#FF6B00';

type Mode = 'selection' | 'email_login' | 'email_register' | 'reset_request';

function mapError(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Correo o contraseña incorrectos.';
    case 'auth/email-already-in-use': return 'Ya existe una cuenta con este correo.';
    case 'auth/invalid-email': return 'Correo electrónico no válido.';
    case 'auth/weak-password': return 'La contraseña debe tener al menos 6 caracteres.';
    case 'auth/too-many-requests': return 'Demasiados intentos. Espera unos momentos.';
    case 'auth/network-request-failed': return 'Error de conexión. Verifica tu internet.';
    default: return 'Ocurrió un error. Intenta de nuevo.';
  }
}

async function googleSignIn() {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    const result = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(auth, credential);
  }
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export default function Login() {
  useEffect(() => { setStatusBarDark(); }, []);
  const [mode, setMode] = useState<Mode>('selection');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const go = (m: Mode) => {
    setMode(m);
    setError('');
    setResetSent(false);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.reload();
    } catch (err: any) {
      setError(mapError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Por favor ingresa tu nombre o nombre del negocio.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: nombre.trim() });
      }
      window.location.reload();
    } catch (err: any) {
      setError(mapError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await googleSignIn();
      window.location.reload();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError('No se pudo iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err: any) {
      setError(mapError(err.code) || 'No encontramos esa cuenta.');
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full px-4 py-3.5 rounded-2xl bg-white/20 text-white placeholder-white/50 border border-white/30 outline-none focus:border-white font-medium text-sm transition-all';

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 relative overflow-hidden select-none" style={{ background: GRAD, paddingTop: "calc(env(safe-area-inset-top) + 24px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
      {/* Background ambient orbs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-amber-900/30 rounded-full blur-3xl pointer-events-none" />

      <AnimatePresence mode="wait">

        {/* ── SELECCIÓN INICIAL ───────────────────────────────── */}
        {mode === 'selection' && (
          <motion.div key="sel" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-8 w-full max-w-xs z-10">
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-2xl border border-white/30">
                <Utensils size={46} className="text-white" />
              </div>
              <div className="text-center">
                <h1 className="text-4xl font-black text-white tracking-widest">YA VOY</h1>
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3 py-0.5 rounded-full mt-2 border border-white/20">
                  <Sparkles size={12} className="text-yellow-300" />
                  <p className="text-white text-xs font-black tracking-[0.25em] uppercase">Restaurante</p>
                </div>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button onClick={handleGoogle} disabled={loading}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 text-slate-900 text-sm">
                {loading ? <Loader2 className="animate-spin text-orange-600" size={20} /> : (
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                Continuar con Google
              </button>

              <button onClick={() => go('email_login')}
                className="w-full bg-white/20 backdrop-blur-md text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 border border-white/30 hover:bg-white/30 active:scale-[0.98] transition-all text-sm">
                <Mail size={18} /> Iniciar con correo
              </button>

              <button onClick={() => go('email_register')}
                className="w-full bg-slate-900/40 backdrop-blur-md text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 border border-white/10 hover:bg-slate-900/60 active:scale-[0.98] transition-all text-sm">
                <Store size={16} /> Registrar nuevo restaurante
              </button>
            </div>

            {error && <p className="text-white bg-red-500/40 border border-red-400/40 rounded-xl px-4 py-3 text-xs font-bold text-center w-full">{error}</p>}

            <p className="text-white/40 text-[11px] text-center leading-relaxed">
              Al continuar, aceptas los{' '}
              <a href="https://batallagroup-tech.github.io/ya-voy/terminos" target="_blank" rel="noopener noreferrer" className="underline text-white/70">Términos</a>
              {' '}y{' '}
              <a href="https://batallagroup-tech.github.io/ya-voy/privacidad" target="_blank" rel="noopener noreferrer" className="underline text-white/70">Privacidad</a>.
            </p>
          </motion.div>
        )}

        {/* ── INICIAR SESIÓN CON EMAIL ────────────────────────── */}
        {mode === 'email_login' && (
          <motion.div key="login" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="w-full max-w-xs z-10">
            <button onClick={() => go('selection')} className="mb-5 text-white/80 flex items-center gap-2 hover:text-white text-sm font-semibold">
              <ArrowLeft size={16} /> Volver
            </button>

            <h2 className="text-2xl font-black text-white mb-1">Iniciar sesión</h2>
            <p className="text-white/60 text-xs mb-5">Ingresa al panel de tu restaurante</p>

            <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="restaurante@correo.com" className={input} />
              </div>

              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Contraseña</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className={input} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-white bg-red-500/40 border border-red-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-center mt-1">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 text-slate-900 text-sm mt-2">
                {loading ? <Loader2 className="animate-spin text-orange-600" size={20} /> : 'Acceder al panel'}
              </button>

              <div className="flex flex-col gap-2.5 mt-2">
                <button type="button" onClick={() => go('reset_request')}
                  className="text-white/60 text-xs text-center hover:text-white transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>

                <button type="button" onClick={() => go('email_register')}
                  className="text-white/80 text-xs font-bold text-center hover:text-white transition-colors">
                  ¿Nuevo restaurante? <span className="underline text-yellow-300">Regístrate aquí</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ── REGISTRO NUEVO RESTAURANTE ─────────────────────── */}
        {mode === 'email_register' && (
          <motion.div key="register" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="w-full max-w-xs z-10">
            <button onClick={() => go('selection')} className="mb-4 text-white/80 flex items-center gap-2 hover:text-white text-sm font-semibold">
              <ArrowLeft size={16} /> Volver
            </button>

            <h2 className="text-2xl font-black text-white mb-1">Registrar Negocio</h2>
            <p className="text-white/60 text-xs mb-4">Crea una cuenta para afiliar tu restaurante</p>

            <form onSubmit={handleEmailRegister} className="flex flex-col gap-3">
              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Nombre de contacto / Negocio</label>
                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                  placeholder="Ej. Taquería El Paisa" className={input} />
              </div>

              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Correo electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="restaurante@correo.com" className={input} />
              </div>

              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Contraseña</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} required placeholder="Mínimo 6 caracteres" className={input} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-white/70 text-xs font-bold mb-1 block">Confirmar contraseña</label>
                <input type={showPw ? 'text' : 'password'} value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repite tu contraseña" className={input} />
              </div>

              {error && <p className="text-white bg-red-500/40 border border-red-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-center mt-1">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 text-slate-900 text-sm mt-2">
                {loading ? <Loader2 className="animate-spin text-orange-600" size={20} /> : 'Registrar restaurante'}
              </button>

              <button type="button" onClick={() => go('email_login')}
                className="text-white/80 text-xs font-bold text-center hover:text-white transition-colors mt-1">
                ¿Ya tienes cuenta? <span className="underline text-yellow-300">Inicia sesión</span>
              </button>
            </form>
          </motion.div>
        )}

        {/* ── RECUPERAR CONTRASEÑA ───────────────────────────── */}
        {mode === 'reset_request' && (
          <motion.div key="reset_req" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }} className="w-full max-w-xs z-10">
            <button onClick={() => go('email_login')} className="mb-5 text-white/80 flex items-center gap-2 hover:text-white text-sm font-semibold">
              <ArrowLeft size={16} /> Volver al login
            </button>

            <h2 className="text-2xl font-black text-white mb-2">Recuperar clave</h2>

            {resetSent ? (
              <div className="flex flex-col gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20">
                <p className="text-white text-sm leading-relaxed">
                  Revisa tu correo <span className="text-yellow-300 font-bold">{email}</span>. Te enviamos un enlace para restablecer tu contraseña.
                </p>
                <button onClick={() => go('email_login')}
                  className="w-full bg-white font-black py-3.5 rounded-2xl flex items-center justify-center shadow-xl hover:opacity-95 text-slate-900 text-sm">
                  Volver a iniciar sesión
                </button>
              </div>
            ) : (
              <>
                <p className="text-white/70 text-xs mb-5">Ingresa tu correo y te enviaremos las instrucciones de recuperación.</p>
                <form onSubmit={handleRequestReset} className="flex flex-col gap-4">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="restaurante@correo.com" className={input} />

                  {error && <p className="text-white bg-red-500/40 border border-red-400/40 rounded-xl px-4 py-2.5 text-xs font-bold text-center">{error}</p>}

                  <button type="submit" disabled={loading || !email}
                    className="w-full bg-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 text-slate-900 text-sm"
                    style={{ color: ACCENT }}>
                    {loading ? <Loader2 className="animate-spin" size={20} /> : 'Enviar enlace'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      <p className="absolute bottom-5 text-white/30 text-[11px] font-medium">Ya Voy Restaurante • Batalla Group</p>
    </div>
  );
}
