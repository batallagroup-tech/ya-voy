import { useState } from 'react'
import { useSignIn } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, LogIn, Chrome, Mail, ArrowLeft } from 'lucide-react'

interface LoginProps {
  onToggleView: () => void
}

export default function Login({ onToggleView }: LoginProps) {
  const { signIn, isLoaded } = useSignIn()
  const [mode, setMode] = useState<'selection' | 'email'>('selection')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        window.location.reload()
      }
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || ''
      if (msg.includes('identifier')) setError('Correo o contrasena incorrectos.')
      else setError('Ocurrio un error al iniciar sesion.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!isLoaded) return
    try {
      setError('')
      setLoading(true)
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin,
      })
    } catch (err: any) {
      setError('Error al iniciar sesion con Google.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#9333ea] via-[#ef4444] to-[#f97316]'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-8'>
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className='text-4xl font-extrabold text-white mb-1 tracking-tighter'
          >
            Ya Voy
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className='text-white/90 font-medium text-base'
          >
            Panel de Restaurante
          </motion.p>
        </div>

        <AnimatePresence mode='wait'>
          {mode === 'selection' ? (
            <motion.div
              key='selection'
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className='space-y-4'
            >
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleGoogleLogin}
                disabled={loading}
                className='w-full py-3.5 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-base disabled:opacity-50'
              >
                <Chrome size={22} className='text-blue-500' />
                Iniciar sesion con Google
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setMode('email')}
                className='w-full py-3.5 bg-[#FF6B00] text-white font-bold rounded-2xl shadow-xl hover:bg-[#E65F00] transition-all flex items-center justify-center gap-3 text-base'
              >
                <Mail size={22} />
                Iniciar sesion con correo
              </motion.button>

              <div className='pt-6 text-center'>
                <p className='text-white/90 text-base'>
                  No tienes cuenta?{' '}
                  <button onClick={onToggleView} className='text-white font-black hover:underline underline-offset-4'>
                    Registrate aqui
                  </button>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key='email-form'
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className='space-y-6'
            >
              <button onClick={() => setMode('selection')} className='flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 font-bold'>
                <ArrowLeft size={20} />
                Volver
              </button>

              <form onSubmit={handleLogin} className='space-y-4'>
                <div>
                  <label className='block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 ml-1'>Correo Electronico</label>
                  <input type='email' value={email} onChange={e => setEmail(e.target.value)}
                    className='w-full px-5 py-3.5 bg-white rounded-2xl focus:ring-4 focus:ring-[#FF6B00]/50 outline-none transition-all text-slate-900 text-base font-medium'
                    placeholder='ejemplo@correo.com' required />
                </div>

                <div className='relative'>
                  <label className='block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 ml-1'>Contrasena</label>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className='w-full px-5 py-3.5 bg-white rounded-2xl focus:ring-4 focus:ring-[#FF6B00]/50 outline-none transition-all text-slate-900 text-base font-medium'
                    placeholder='...' required />
                  <button type='button' onClick={() => setShowPassword(!showPassword)}
                    className='absolute right-5 top-[38px] text-slate-400 hover:text-slate-600 transition-colors'>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className='text-white bg-red-500/80 backdrop-blur-md p-4 rounded-2xl text-sm text-center font-bold border border-white/20 shadow-lg'>
                    {error}
                  </motion.p>
                )}

                <motion.button whileTap={{ scale: 0.95 }} type='submit' disabled={loading}
                  className='w-full py-4 bg-[#FF6B00] hover:bg-[#E65F00] text-white font-black rounded-2xl shadow-2xl shadow-orange-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg'>
                  {loading ? 'Cargando...' : (<><LogIn size={22} />Entrar</>)}
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className='mt-12 text-center'>
          <p className='text-white/40 text-[10px] font-black uppercase tracking-[0.3em]'>
            Desarrollado por <span className='text-white/60'>Batalla Group</span>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
