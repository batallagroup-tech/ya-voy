import { Toaster } from 'sonner'
import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth, useUser, useClerk, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { AnimatePresence } from 'motion/react';
import SplashScreen from './components/SplashScreen';
import ServerWarmup from './components/ServerWarmup';
import { syncUsuario, getSolicitud, getNegocio } from './lib/api';
import { usePushNotifications } from './hooks/usePushNotifications'

const Login           = lazy(() => import('./pages/Login'));
const RestaurantSetup = lazy(() => import('./pages/RestaurantSetup'));
const PendingReview   = lazy(() => import('./pages/PendingReview'));
const Rejected        = lazy(() => import('./pages/Rejected'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));

type AppStatus = 'loading' | 'setup' | 'pendiente' | 'rechazado' | 'aprobado';

export default function App() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const { user } = useUser()
  usePushNotifications({ userId, getToken });
  const { signOut } = useClerk();
  const [showSplash, setShowSplash] = useState(true)
  const [status, setStatus] = useState<AppStatus>('loading');
  const [solicitudData, setSolicitudData] = useState<any>(null);
  const [negocioData, setNegocioData] = useState<any>(null);
  const [isReapplying, setIsReapplying] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !user) return;
    const init = async () => {
      try { await syncUsuario({
        userId,
        email: user.primaryEmailAddress?.emailAddress ?? '',
        nombre: user.fullName ?? '',
        fotoUrl: user.imageUrl ?? '',
        rol: 'negocio',
      }); } catch {}

      try {
        const negocio: any = await getNegocio(userId).catch(() => null);
        if (negocio) {
          setNegocioData(negocio);
          setStatus('aprobado');
          return;
        }
        const solicitud: any = await getSolicitud(userId).catch(() => null);
        if (solicitud) {
          setSolicitudData(solicitud);
          setStatus(solicitud.status);
        } else {
          setStatus('setup');
        }
      } catch {
        setStatus('setup');
      }
    };
    init();
  }, [isLoaded, isSignedIn, userId, user]);

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen onDone={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  if (window.location.pathname === '/sso-callback') return <><ServerWarmup /><AuthenticateWithRedirectCallback /></>;

  const spinner = (
    <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isLoaded || !isSignedIn) return <Suspense fallback={spinner}><ServerWarmup /><Login /></Suspense>;

  if (status === 'loading') return <>{spinner}<ServerWarmup /></>;

  if (status === 'pendiente') return <Suspense fallback={spinner}><PendingReview /></Suspense>;

  if (status === 'rechazado') return (
    <Suspense fallback={spinner}>
      <Rejected
        reason={solicitudData?.razon_rechazo}
        onReapply={() => { setIsReapplying(true); setStatus('setup'); }}
      />
    </Suspense>
  );

  if (status === 'aprobado') return <Suspense fallback={spinner}><Dashboard negocio={negocioData} /></Suspense>;

  return (
    <Suspense fallback={spinner}>
      <div className="relative">
        <button
          onClick={() => signOut()}
          className="fixed top-4 right-4 z-50 bg-white border border-slate-200 text-slate-500 text-sm px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-all"
        >
          Cerrar sesion
        </button>
        <RestaurantSetup
          userId={userId}
          userEmail={user?.primaryEmailAddress?.emailAddress ?? ''}
          initialData={isReapplying ? solicitudData : null}
          onSubmit={() => setStatus('pendiente')}
          onCancel={isReapplying ? () => { setIsReapplying(false); setStatus('rechazado'); } : undefined}
        />
      </div>
    </Suspense>
  );
}
