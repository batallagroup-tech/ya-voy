import { Toaster } from 'sonner'
import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth, useUser, useClerk, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import ServerWarmup from './components/ServerWarmup';
import { syncUsuario, getSolicitud, getNegocio, API } from './lib/api';
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
  const [notifPedidoId, setNotifPedidoId] = useState<string | null>(null);
  usePushNotifications({ userId, getToken, onNotification: (data) => { if (data?.pedidoId) setNotifPedidoId(data.pedidoId); } });
  const { signOut } = useClerk();
  const [showSplash, setShowSplash] = useState(true)
  const [status, setStatus] = useState<AppStatus>('loading');
  const [solicitudData, setSolicitudData] = useState<any>(null);
  const [negocioData, setNegocioData] = useState<any>(null);
  const [isReapplying, setIsReapplying] = useState(false);
  const [duplicadoCuenta, setDuplicadoCuenta] = useState<any>(null);
  const [fusionarLoading, setFusionarLoading] = useState(false);
  const [fusionarError, setFusionarError] = useState('');

  const handleFusionar = async () => {
    if (!duplicadoCuenta) return;
    setFusionarLoading(true);
    setFusionarError('');
    try {
      const token = await getToken();
      const res = await fetch(API + '/api/auth/fusionar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ duplicadoId: duplicadoCuenta.id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Error al fusionar');
      window.location.reload();
    } catch (e: any) {
      setFusionarError(e.message);
      setFusionarLoading(false);
    }
  };

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
      if (!sessionStorage.getItem('ya_voy_dup_check')) {
        sessionStorage.setItem('ya_voy_dup_check', '1');
        const email = user.primaryEmailAddress?.emailAddress;
        if (email) {
          const token = await getToken();
          if (token) {
            fetch(API + '/api/auth/verificar-duplicado?email=' + encodeURIComponent(email), {
              headers: { 'Authorization': 'Bearer ' + token },
            }).then(r => r.json()).then(d => { if (d.duplicado) setDuplicadoCuenta(d.duplicado); }).catch(() => {});
          }
        }
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

  const fusionarModal = duplicadoCuenta ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
        <div className="text-center mb-5">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">🔀</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Cuenta duplicada</h2>
          <p className="text-slate-500 text-sm mt-1">Encontramos otra cuenta con tu mismo correo</p>
        </div>
        <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-sm">
          <p className="font-bold text-slate-700">{duplicadoCuenta.nombre || 'Sin nombre'}</p>
          <p className="text-slate-500">{duplicadoCuenta.email}</p>
        </div>
        <p className="text-slate-400 text-xs text-center mb-4">
          Al fusionar, todo el historial de la cuenta anterior pasará a tu cuenta actual. Esta acción no se puede deshacer.
        </p>
        {fusionarError && <p className="text-red-500 text-sm text-center mb-3">{fusionarError}</p>}
        <button onClick={handleFusionar} disabled={fusionarLoading}
          className="w-full py-3.5 rounded-2xl font-black text-white mb-3 flex items-center justify-center gap-2 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #cc4400 100%)' }}>
          {fusionarLoading && <Loader2 className="animate-spin" size={18} />}
          Fusionar cuentas
        </button>
        <button onClick={() => { setDuplicadoCuenta(null); sessionStorage.setItem('ya_voy_dup_ignored', '1'); }}
          className="w-full py-2.5 rounded-2xl text-slate-500 font-medium text-sm">
          No por ahora
        </button>
      </div>
    </div>
  ) : null;

  if (status === 'loading') return <>{spinner}<ServerWarmup /></>;

  if (status === 'pendiente') return (
    <>
      {fusionarModal}
      <Suspense fallback={spinner}><PendingReview /></Suspense>
    </>
  );

  if (status === 'rechazado') return (
    <>
      {fusionarModal}
      <Suspense fallback={spinner}>
        <Rejected
          reason={solicitudData?.razon_rechazo}
          onReapply={() => { setIsReapplying(true); setStatus('setup'); }}
        />
      </Suspense>
    </>
  );

  if (status === 'aprobado') return (
    <>
      {fusionarModal}
      <Suspense fallback={spinner}><Dashboard negocio={negocioData} notifPedidoId={notifPedidoId} onNotifHandled={() => setNotifPedidoId(null)} /></Suspense>
    </>
  );

  return (
    <>
      {fusionarModal}
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
    </>
  );
}
