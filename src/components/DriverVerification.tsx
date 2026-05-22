import React, { useState } from 'react';
import { Camera, CreditCard, ShieldCheck, Loader2, CheckCircle2, AlertCircle, Upload, X } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';

export const DriverVerification = ({ onComplete }: { onComplete: () => void }) => {
  const { uploadDriverDocuments, verifyAccount, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<{
    front: File | null;
    back: File | null;
    selfie: File | null;
  }>({
    front: null,
    back: null,
    selfie: null
  });

  const [previews, setPreviews] = useState<{
    front: string | null;
    back: string | null;
    selfie: string | null;
  }>({
    front: null,
    back: null,
    selfie: null
  });

  const [activeMenu, setActiveMenu] = useState<'front' | 'back' | 'selfie' | null>(null);

  const handleFileChange = (type: 'front' | 'back' | 'selfie', file: File | null) => {
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('El archivo es demasiado grande. Máximo 5MB.');
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
    };
    reader.readAsDataURL(file);
    setError(null);
  };

  const handleUpload = async () => {
    if (!files.front || !files.back || !files.selfie) {
      setError('Por favor sube todos los documentos requeridos.');
      return;
    }

    setValidating(true);
    setError(null);
    
    try {
      // Start upload
      // We don't await here if we want it to be "non-blocking" for the UI transition,
      // but we should at least start it and then move to the next screen.
      // The user wants it to be real and functional without freezing.
      
      await uploadDriverDocuments({
        front: files.front,
        back: files.back,
        selfie: files.selfie
      });

      // After upload is initiated/completed, we show success/pending state
      onComplete();
    } catch (err: any) {
      console.error('Upload error:', err);
      setValidating(false);
      setError(err.message || 'Error al subir documentos. Intenta de nuevo.');
    }
  };

  const isComplete = files.front && files.back && files.selfie;

  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center animate-in fade-in zoom-in">
        <div className="relative">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-full animate-pulse">
            <ShieldCheck size={48} />
          </div>
          <div className="absolute inset-0 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Recibiendo documentos</h2>
          <p className="text-slate-500 font-bold text-xs">Nuestro sistema los está validando...</p>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, ease: "linear" }}
            className="h-full bg-purple-600"
          />
        </div>
      </div>
    );
  }

  if (profile?.driverProfile?.documents?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-4 text-center">
        <div className="p-4 bg-purple-50 text-purple-600 rounded-full animate-pulse">
          <ShieldCheck size={48} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Documentos en Revisión</h2>
          <p className="text-slate-500 font-bold text-xs">Estamos validando tu identidad. Una vez aprobada, tu cuenta aparecerá como "Cuenta Verificada".</p>
        </div>
        <button 
          onClick={onComplete}
          className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase tracking-tighter text-sm"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-2">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">Verificación de Identidad</h2>
        <p className="text-slate-400 font-bold text-[10px]">Sube una foto clara de tu INE (frente) y una selfie tuya para validar tu cuenta.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-[10px] font-bold animate-in fade-in slide-in-from-top-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {/* INE Front */}
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">INE Frontal</label>
          <div className="relative aspect-[1.4/1] bg-slate-50 rounded-[20px] border-2 border-dashed border-slate-200 overflow-hidden group">
            {previews.front ? (
              <>
                <img src={previews.front} className="w-full h-full object-cover" alt="INE Front" />
                <button 
                  onClick={() => { setFiles(f => ({...f, front: null})); setPreviews(p => ({...p, front: null})); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div 
                onClick={() => setActiveMenu('front')}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <CreditCard size={24} className="text-slate-300 mb-1" />
                <span className="text-[8px] font-black uppercase text-slate-400">Seleccionar</span>
              </div>
            )}
          </div>
        </div>

        {/* INE Back */}
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest">INE Trasera</label>
          <div className="relative aspect-[1.4/1] bg-slate-50 rounded-[20px] border-2 border-dashed border-slate-200 overflow-hidden group">
            {previews.back ? (
              <>
                <img src={previews.back} className="w-full h-full object-cover" alt="INE Back" />
                <button 
                  onClick={() => { setFiles(f => ({...f, back: null})); setPreviews(p => ({...p, back: null})); }}
                  className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X size={12} />
                </button>
              </>
            ) : (
              <div 
                onClick={() => setActiveMenu('back')}
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <CreditCard size={24} className="text-slate-300 mb-1" />
                <span className="text-[8px] font-black uppercase text-slate-400">Seleccionar</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selfie */}
      <div className="space-y-1">
        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 tracking-widest block text-center">Selfie con INE</label>
        <div className="relative aspect-square bg-slate-50 rounded-[20px] border-2 border-dashed border-slate-200 overflow-hidden group max-w-[140px] mx-auto">
          {previews.selfie ? (
            <>
              <img src={previews.selfie} className="w-full h-full object-cover" alt="Selfie" />
              <button 
                onClick={() => { setFiles(f => ({...f, selfie: null})); setPreviews(p => ({...p, selfie: null})); }}
                className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
              >
                <X size={12} />
              </button>
            </>
          ) : (
            <div 
              onClick={() => setActiveMenu('selfie')}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <Camera size={24} className="text-slate-300 mb-1" />
              <span className="text-[8px] font-black uppercase text-slate-400">Tomar Selfie</span>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeMenu && (
          <div className="fixed inset-0 z-[300] flex items-end justify-center p-6 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-sm bg-white rounded-[40px] p-8 space-y-4 shadow-2xl"
            >
              <h3 className="text-xl font-black italic uppercase tracking-tighter text-center mb-6">Seleccionar Origen</h3>
              
              <label className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black uppercase tracking-tighter flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all">
                <Camera size={20} />
                Tomar Foto
                <input 
                  type="file" 
                  accept="image/*" 
                  capture={activeMenu === 'selfie' ? 'user' : 'environment'} 
                  className="hidden" 
                  onChange={e => {
                    handleFileChange(activeMenu, e.target.files?.[0] || null);
                    setActiveMenu(null);
                  }} 
                />
              </label>

              <label className="w-full py-5 bg-slate-100 text-slate-800 rounded-[25px] font-black uppercase tracking-tighter flex items-center justify-center gap-3 cursor-pointer active:scale-95 transition-all">
                <Upload size={20} />
                Subir Archivo/Foto
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={e => {
                    handleFileChange(activeMenu, e.target.files?.[0] || null);
                    setActiveMenu(null);
                  }} 
                />
              </label>

              <button 
                onClick={() => setActiveMenu(null)}
                className="w-full py-4 text-slate-400 font-black uppercase tracking-tighter text-sm"
              >
                Cancelar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <button 
        disabled={!isComplete || validating}
        onClick={handleUpload}
        className="w-full py-4 bg-purple-600 text-white rounded-[20px] font-black text-sm shadow-xl shadow-purple-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
      >
        <Upload size={16} />
        Subir Documentos
      </button>
    </div>
  );
};
