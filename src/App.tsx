import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { sql } from './lib/db'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import RestaurantSetup from './pages/RestaurantSetup'
import PendingReview from './pages/PendingReview'
import Rejected from './pages/Rejected'
import { motion, AnimatePresence } from 'motion/react'
import SplashScreen from './components/SplashScreen'
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react'

export default function App() {
  if (window.location.pathname === '/sso-callback') {
    return <AuthenticateWithRedirectCallback />
  }

  const { isLoaded, isSignedIn, userId } = useAuth()
  const { user } = useUser()
  const [view, setView] = useState<'login' | 'register'>('login')
  const [restaurantData, setRestaurantData] = useState<any>(null)
  const [hasRestaurant, setHasRestaurant] = useState<boolean | null>(null)
  const [isReapplying, setIsReapplying] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)

  // Cuando el usuario inicia sesion, guardar/actualizar en Neon
  useEffect(() => {
    if (!isSignedIn || !userId || !user) return

    const syncUser = async () => {
      try {
        await sql`
          INSERT INTO usuarios (id, email, nombre, foto_url)
          VALUES (${userId}, ${user.primaryEmailAddress?.emailAddress ?? ''}, ${user.fullName ?? ''}, ${user.imageUrl ?? ''})
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            nombre = EXCLUDED.nombre,
            foto_url = EXCLUDED.foto_url
        `
      } catch (err) {
        console.error('Error sincronizando usuario:', err)
      }
    }

    syncUser()
  }, [isSignedIn, userId, user])

  // Consultar estado del negocio en Neon
  useEffect(() => {
    if (!isSignedIn || !userId) return

    const fetchStatus = async () => {
      setStatusLoading(true)
      try {
        const viveres = await sql`
          SELECT * FROM viveres WHERE owner_id = ${userId} LIMIT 1
        `
        if (viveres.length > 0) {
          setRestaurantData(viveres[0])
          setHasRestaurant(true)
          return
        }

        const solicitudes = await sql`
          SELECT * FROM solicitudes WHERE usuario_id = ${userId}
          ORDER BY creado_en DESC LIMIT 1
        `
        if (solicitudes.length > 0) {
          setRestaurantData(solicitudes[0])
          setHasRestaurant(true)
        } else {
          setHasRestaurant(false)
        }
      } catch (err) {
        console.error('Error consultando estado:', err)
        setHasRestaurant(false)
      } finally {
        setStatusLoading(false)
      }
    }

    fetchStatus()
  }, [isSignedIn, userId])

  if (!isLoaded || statusLoading) {
    return <SplashScreen />
  }

  if (isSignedIn) {
    if (hasRestaurant === null) {
      return <SplashScreen />
    }

    if (hasRestaurant === true) {
      if (restaurantData?.status === 'pendiente') {
        return <PendingReview />
      }
      if (restaurantData?.status === 'rechazado') {
        return <Rejected reason={restaurantData?.razon_rechazo} onReapply={() => setIsReapplying(true)} />
      }
      if (restaurantData?.status === 'aprobado') {
        return <Dashboard />
      }
    }

    if (hasRestaurant === false || isReapplying) {
      return (
        <RestaurantSetup
          user={{ id: userId, email: user?.primaryEmailAddress?.emailAddress }}
          initialData={isReapplying ? restaurantData : null}
          onCancelReapply={() => setIsReapplying(false)}
        />
      )
    }

    return (
      <div className='min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4'>
        <div className='w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-4' />
        <p className='text-slate-600 font-medium'>Verificando estado de tu restaurante...</p>
      </div>
    )
  }

  return (
    <AnimatePresence mode='wait'>
      {view === 'login' ? (
        <motion.div
          key='login'
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className='w-full'
        >
          <Login onToggleView={() => setView('register')} />
        </motion.div>
      ) : (
        <motion.div
          key='register'
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className='w-full'
        >
          <Register onToggleView={() => setView('login')} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
