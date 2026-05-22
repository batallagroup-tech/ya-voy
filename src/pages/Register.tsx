import { useState } from 'react'
import { useSignUp } from '@clerk/clerk-react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, UserPlus, ArrowLeft, Chrome, Mail } from 'lucide-react'

interface RegisterProps {
  onToggleView: () => void
}

export default function Register({ onToggleView }: RegisterProps) {
  const { signUp, isLoaded } = useSignUp()
  const [mode, setMode] = useState<'selection' | 'email' | 'verify'>('selection')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordsMatch = password === confirmPassword && password !== ''

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded || !passwordsMatch) return
    setLoading(true)
    setError('')
    try {
      await signUp.create({ emailAddress: email, password })
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setMode('verify')
    } catch (err: any) {
      const msg = err.errors?.[0]?.message || ''
      if (msg.includes('already')) setError('Este correo ya esta registrado.')
      else if (msg.includes('password')) setError('La contrasena es muy debil (minimo 8 caracteres).')
      else setError('Error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return
    setLoading(true)
    setError('')
    try {
      const result = await signUp.attemptEmailAddressVerification({ code })
      if (result.status === 'complete') {
        window.location.reload()
      }
    } catch (err: any) {
      setError('Codigo incorrecto. Revisa tu correo.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = async () => {
    if (!isLoaded) return
    try {
      setError('')
      setLoading(true)
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: window.location.origin + '/sso-callback',
        redirectUrlComplete: window.location.origin,
      })
    } catch (err: any) {
      setError('Error al registrarse con Google.')
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-[#9333ea] via-[#ef4444] to-[#f97316]'>
      <div className='w-full max-w-sm'>
        <div className='text-center mb-8'>
          <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className='text-4xl font-extrabold text-white mb-1 tracking-tighter'>
            Ya Voy
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className='text-white/90 font-medium text-base'>
            Crea tu cuenta de Restaurante
          </motion.p>
        </div>

        <AnimatePresence mode='wait'>
          {mode === 'verify' ? (
            <motion.div key='verify' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className='space-y-6'>
              <div className='text-center'>
                <p className='text-white font-bold text-lg mb-1'>Revisa tu correo</p>
                <p className='text-white/70 text-sm'>Te enviamos un codigo de verificacion a {email}</p>
              </div>
              <form onSubmit={handleVerify} className='space-y-4'>
                <input value={code} onChange={e => setCode(e.target.value)}
                  className='w-full px-5 py-3.5 bg-white rounded-2xl text-center text-2xl font-black tracking-widest outline-none text-slate-900'
                  placeholder='000000' maxLength={6} required />
                {error && <p className='text-white bg-red-500/80 p-3 rounded-2xl text-sm text-center font-bold'>{error}</p>}
                <motion.button whileTap={{ scale: 0.95 }} type='submit' disabled={loading}
                  className='w-full py-4 bg-[#FF6B00] text-white font-black rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg'>
                  {loading ? 'Verificando...' : 'Confirmar cuenta'}
                </motion.button>
              </form>
            </motion.div>
          ) : mode === 'selection' ? (
            <motion.div key='selection' initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className='space-y-4'>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleGoogleRegister}
                className='w-full py-3.5 bg-white text-slate-900 font-bold rounded-2xl shadow-xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 text-base'>
                <Chrome size={22} className='text-blue-500' />
                Registrate con Google
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setMode('email')}
                className='w-full py-3.5 bg-[#FF6B00] text-white font-bold rounded-2xl shadow-xl hover:bg-[#E65F00] transition-all flex items-center justify-center gap-3 text-base'>
                <Mail size={22} />
                Registrate con correo
              </motion.button>
              <div className='pt-6 text-center'>
                <p className='text-white/90 text-base'>
                  Ya tienes cuenta?{' '}
                  <button onClick={onToggleView} className='text-white font-black hover:underline underline-offset-4'>Inicia sesion</button>
                </p>
              </div>
            </motion.div>
          ) : (
            <motion.div key='email-form' initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className='space-y-6'>
              <button onClick={() => setMode('selection')} className='flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 font-bold'>
                <ArrowLeft size={20} />Volver
              </button>
              <form onSubmit={handleRegister} className='space-y-4'>
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
                    placeholder='Minimo 8 caracteres' required />
                  <button type='button' onClick={() => setShowPassword(!showPassword)} className='absolute right-5 top-[38px] text-slate-400'>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div>
                  <label className='block text-xs font-bold text-white/80 uppercase tracking-wider mb-1.5 ml-1'>Confirmar Contrasena</label>
                  <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    className={`w-full px-5 py-3.5 bg-white rounded-2xl focus:ring-4 outline-none transition-all text-slate-900 text-base font-medium ${confirmPassword && !passwordsMatch ? 'ring-4 ring-red-500/50' : confirmPassword && passwordsMatch ? 'ring-4 ring-green-500/50' : 'focus:ring-[#FF6B00]/50'}`}
                    placeholder='Repite tu contrasena' required />
                </div>
                {error && <p className='text-white bg-red-500/80 p-4 rounded-2xl text-sm text-center font-bold'>{error}</p>}
                <motion.button whileTap={{ scale: 0.95 }} type='submit' disabled={loading || !passwordsMatch}
                  className='w-full py-4 bg-[#FF6B00] hover:bg-[#E65F00] text-white font-black rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-lg'>
                  {loading ? 'Creando cuenta...' : (<><UserPlus size={24} />Registrarse</>)}
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
