import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Trash2, ShieldAlert, Key, Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface SecuritySettingsProps {
  setShowSecuritySettings: (show: boolean) => void;
  logout: () => void;
  deleteAccount: (pass?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  profile: any;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ setShowSecuritySettings, logout, deleteAccount, sendPasswordReset, profile }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleResetPassword = async () => {
    if (!profile?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordReset(profile.email);
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      setShowDeleteModal(false);
      setShowSecuritySettings(false);
    } catch (err: any) {
      // Error handled in provider/toast
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[150] bg-white dark:bg-slate-950 flex flex-col animate-in slide-in-from-right duration-300">
      <header className="p-8 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 flex items-center space-x-6 relative overflow-hidden text-left">
        <button 
          onClick={() => setShowSecuritySettings(false)} 
          className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-800 dark:text-white hover:bg-slate-100 transition-colors relative z-10"
        >
          <ArrowLeft size={24}/>
        </button>
        <div className="relative z-10">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Privacidad</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gestiona tu seguridad</p>
        </div>
      </header>
      
      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2 text-left">Configuración de Seguridad</h3>
          <div className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-50 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
             <button 
               onClick={handleResetPassword}
               disabled={isSendingReset}
               className="w-full p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors disabled:opacity-50"
             >
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl">
                   {isSendingReset ? <Loader2 size={20} className="animate-spin" /> : <Key size={20} />}
                 </div>
                 <div className="text-left">
                    <span className="font-black italic uppercase tracking-tight dark:text-white text-sm block">Restablecer Contraseña</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Se enviará un link a tu correo</span>
                 </div>
               </div>
               <ChevronRight size={18} className="text-slate-300" />
             </button>
             
             <div className="p-6 flex items-center justify-between">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                   <ShieldAlert size={20} />
                 </div>
                 <div className="text-left">
                    <span className="font-black italic uppercase tracking-tight dark:text-white text-sm block">Último Acceso</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      {profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'Recientemente'}
                    </span>
                 </div>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="text-[8px] font-black uppercase text-green-500">Activa</span>
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               </div>
             </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-red-400 uppercase tracking-widest px-2 text-left">Zona de Peligro</h3>
          <button 
            onClick={() => setShowDeleteModal(true)}
            className="w-full p-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-[35px] flex items-center space-x-4 transition-all active:scale-95 group text-left"
          >
            <div className="p-3 bg-white dark:bg-red-900/20 text-red-600 rounded-2xl shadow-sm group-hover:bg-red-600 group-hover:text-white transition-all">
              <Trash2 size={24}/>
            </div>
            <div>
              <p className="font-black italic uppercase tracking-tight text-red-600">Eliminar Cuenta</p>
              <p className="text-[10px] font-bold text-red-400 leading-tight">Esta acción es irreversible y borrará todos tus datos.</p>
            </div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDeleteModal && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white dark:bg-slate-950 flex flex-col"
            >
              <header className="p-8 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800 flex items-center space-x-6 relative overflow-hidden text-left">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-800 dark:text-white hover:bg-slate-100 transition-colors relative z-10"
                >
                  <ArrowLeft size={24}/>
                </button>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter dark:text-white">Eliminar Cuenta</h2>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest italic">Confirmación de seguridad</p>
                </div>
              </header>
              
              <div className="flex-1 p-8 space-y-8 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-[35px] flex items-center justify-center shadow-xl mb-6 ring-8 ring-red-50 dark:ring-red-900/10">
                  <Trash2 size={48} />
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-3xl font-black italic uppercase tracking-tighter dark:text-white leading-none">¿Estás seguro?</h2>
                  <p className="text-slate-500 dark:text-slate-400 font-bold text-sm leading-relaxed max-w-xs mx-auto">
                    Esta acción es irreversible. Se borrarán todos tus pedidos, direcciones y datos personales permanentemente.
                  </p>
                </div>

                {profile?.providerData?.[0]?.providerId === 'password' ? (
                  <div className="w-full max-w-sm space-y-4 mt-8">
                    <div className="relative">
                      <input 
                        type={showPassword ? "text" : "password"} 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Tu contraseña"
                        className="w-full pl-6 pr-14 py-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-transparent focus:border-red-400 outline-none font-black text-sm dark:text-white transition-all shadow-inner"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase">Debes ingresar tu contraseña para continuar</p>
                  </div>
                ) : (
                  <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-3xl border-2 border-blue-100 dark:border-blue-900/20 max-w-xs">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      Como usas <span className="uppercase font-black">{profile?.providerData?.[0]?.providerId || 'Google'}</span>, serás redirigido para re-autenticarte antes de la eliminación por seguridad.
                    </p>
                  </div>
                )}

                <div className="w-full max-w-xs space-y-4 mt-12">
                  <button 
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="w-full py-6 bg-red-600 text-white rounded-[25px] font-black uppercase text-xs tracking-widest shadow-xl shadow-red-200 dark:shadow-none active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                    <span>Borrar Cuenta para Siempre</span>
                  </button>
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all disabled:opacity-50"
                  >
                     Mejor no, volver atrás
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
