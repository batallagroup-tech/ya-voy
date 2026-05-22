import React, { useState, useEffect } from 'react';
import { Mail, Smartphone as PhoneIcon, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Scan, Camera, CreditCard, RefreshCw } from 'lucide-react';
import { useAuth } from './FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { DriverVerification } from './DriverVerification';

export const VerificationSteps = ({ onFinish }: { onFinish: () => void }) => {
  const { profile, sendVerificationEmail, checkEmailVerification, sendPhoneCode, confirmPhoneCode } = useAuth();
  const [step, setStep] = useState(1); // 1: Email, 2: SMS, 3: Documents
  const [subStep, setSubStep] = useState<'input' | 'verify' | 'success' | 'scanning'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(profile?.phoneNumber || '');
  const [code, setCode] = useState('');

  // Sync phone if profile updates
  useEffect(() => {
    if (profile?.phoneNumber && !phone) {
      setPhone(profile.phoneNumber);
    }
  }, [profile?.phoneNumber]);

  // Auto-skip verified steps (Strict linear flow)
  useEffect(() => {
    if (step === 1 && profile?.phoneVerified) {
      setStep(2);
      setSubStep('input');
    } else if (step === 2 && profile?.emailVerified) {
      setStep(3);
      setSubStep('input');
    }
  }, [profile?.emailVerified, profile?.phoneVerified]);

  // If already in step 3 and documents are pending, show success
  useEffect(() => {
    if (step === 3 && profile?.driverProfile?.documents?.status === 'pending') {
      setSubStep('success');
    }
  }, [step, profile?.driverProfile?.documents?.status]);

  const steps = [
    { id: 1, title: "Verificar Teléfono", desc: "Ingresa tu número para recibir un código SMS de confirmación.", icon: <PhoneIcon size={32}/> },
    { id: 2, title: "Verificar Email", desc: "Te enviaremos un código de verificación a tu correo electrónico.", icon: <Mail size={32}/> },
    { id: 3, title: "Identidad (INE)", desc: "Sube tu INE (frente) y una selfie para validar tu identidad.", icon: <ShieldCheck size={32}/> }
  ];

  const handleSendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      if (step === 1) {
        // Real Phone Verification via Twilio
        await sendPhoneCode(phone);
        setSubStep('verify');
      } else if (step === 2) {
        // Real Email Verification via Resend
        if (profile?.email) {
          await sendVerificationEmail(profile.email);
          setSubStep('verify');
        }
      } else if (step === 3) {
        handleStartScan();
      }
    } catch (err: any) {
      console.error("Error sending code:", err);
      setError(err.message || "Error al enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);
    try {
      if (step === 1) {
        await confirmPhoneCode(phone, code);
        // Auto-advance to next step
        setStep(2);
        setSubStep('input');
        setCode('');
      } else if (step === 2) {
        if (profile?.email) {
          const isVerified = await checkEmailVerification(profile.email, code);
          if (isVerified) {
            // Auto-advance to next step
            setStep(3);
            setSubStep('input');
            setCode('');
            setError(null);
          } else {
            setError('Código incorrecto');
          }
        }
      }
    } catch (err: any) {
      console.error("Error verifying code:", err);
      setError('Código incorrecto');
    } finally {
      setLoading(false);
    }
  };

  const handleStartScan = () => {
    setSubStep('scanning');
  };

  const handleNextStep = () => {
    if (step < 3) {
      setStep(step + 1);
      setSubStep('input');
      setCode('');
    } else {
      onFinish();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col animate-in slide-in-from-bottom">
      <header className="p-6 flex items-center justify-between border-b border-slate-50">
        <div className="w-10"></div>
        <div className="flex space-x-1">
          {[1,2,3].map(i => (
            <div key={i} className={`h-1.5 w-10 rounded-full transition-all duration-500 ${step >= i ? 'bg-purple-600' : 'bg-slate-100'}`}></div>
          ))}
        </div>
        <div className="w-10"></div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div 
            key={`${step}-${subStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-8 flex flex-col items-center justify-center min-h-full text-center space-y-8"
          >
            {subStep !== 'scanning' && (
              <div className="p-8 bg-purple-50 text-purple-600 rounded-[40px] shadow-inner">
                {steps[step-1].icon}
              </div>
            )}

            <div className="space-y-2">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                {subStep === 'scanning' ? 'Escaneando INE...' : steps[step-1].title}
              </h2>
              <p className="text-slate-400 font-bold max-w-xs mx-auto">
                {subStep === 'scanning' ? 'Mantén tu identificación frente a la cámara' : steps[step-1].desc}
              </p>
            </div>

            {/* Step 1: Phone */}
            {step === 1 && (
              <div className="w-full max-w-xs space-y-4">
                {subStep === 'input' && (
                  <>
                    <input 
                      type="tel" 
                      placeholder="+52 55 0000 0000" 
                      className="w-full p-6 bg-slate-50 rounded-[25px] font-black text-center text-2xl outline-none border-2 border-transparent focus:border-purple-200 transition-all" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <div id="recaptcha-container"></div>
                  </>
                )}
                {subStep === 'verify' && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Ingresa el código de 6 dígitos</p>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000" 
                      className="w-full p-6 bg-slate-50 rounded-[25px] font-black text-center text-3xl tracking-[0.5em] outline-none border-2 border-transparent focus:border-purple-200 transition-all" 
                      value={code}
                      onChange={(e) => { setCode(e.target.value); setError(null); }}
                    />
                    {error && (
                      <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                        {error}
                      </p>
                    )}
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={handleSendCode}
                        className="text-[10px] font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
                      >
                        Reenviar código
                      </button>
                      <button 
                        onClick={() => setSubStep('input')}
                        className="text-[10px] font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
                      >
                        Cambiar número
                      </button>
                    </div>
                  </div>
                )}
                {subStep === 'success' && (
                  <div className="flex flex-col items-center space-y-4 text-green-600 animate-in zoom-in">
                    <div className="p-6 bg-green-50 rounded-full"><CheckCircle2 size={48} /></div>
                    <p className="font-black uppercase italic">¡Teléfono Verificado!</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Email */}
            {step === 2 && (
              <div className="w-full max-w-xs space-y-4">
                {subStep === 'input' && (
                  <div className="p-6 bg-slate-50 rounded-[25px] font-bold text-slate-600">
                    {profile?.email || 'usuario@ejemplo.com'}
                  </div>
                )}
                {subStep === 'verify' && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase text-purple-600 tracking-widest">Ingresa el código enviado a tu correo</p>
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="000000" 
                      className="w-full p-6 bg-slate-50 rounded-[25px] font-black text-center text-3xl tracking-[0.5em] outline-none border-2 border-transparent focus:border-purple-200 transition-all" 
                      value={code}
                      onChange={(e) => { setCode(e.target.value); setError(null); }}
                    />
                    {error && (
                      <p className="text-xs font-bold text-red-500 animate-in fade-in slide-in-from-top-1">
                        {error}
                      </p>
                    )}
                    <button 
                      onClick={handleSendCode}
                      className="text-[10px] font-black uppercase text-slate-400 hover:text-purple-600 transition-colors"
                    >
                      Reenviar código
                    </button>
                  </div>
                )}
                {subStep === 'success' && (
                  <div className="flex flex-col items-center space-y-4 text-green-600 animate-in zoom-in">
                    <div className="p-6 bg-green-50 rounded-full"><CheckCircle2 size={48} /></div>
                    <p className="font-black uppercase italic">¡Email Verificado!</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: INE Driver Verification */}
            {step === 3 && (
              <div className="w-full max-w-md">
                <DriverVerification onComplete={() => setSubStep('success')} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-8 bg-white border-t border-slate-50">
        {step < 3 && subStep === 'input' && (
          <button 
            disabled={loading || (step === 1 && !phone)}
            onClick={handleSendCode} 
            className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black text-lg shadow-xl shadow-purple-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <RefreshCw size={20} />}
            Enviar Código
          </button>
        )}
        {step < 3 && subStep === 'verify' && (
          <button 
            disabled={loading || code.length < 6}
            onClick={handleVerifyCode} 
            className="w-full py-5 bg-purple-600 text-white rounded-[25px] font-black text-lg shadow-xl shadow-purple-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={24} /> : <ShieldCheck size={20} />}
            Verificar Código
          </button>
        )}
        {subStep === 'success' && (
          <button 
            onClick={handleNextStep} 
            className="w-full py-5 bg-slate-900 text-white rounded-[25px] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {step < 3 ? 'Siguiente Paso' : 'Finalizar Verificación'}
            <ArrowLeft className="rotate-180" size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
