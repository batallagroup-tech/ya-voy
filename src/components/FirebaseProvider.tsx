import React, { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, storage, googleProvider, saveUserProfile, OperationType, handleFirestoreError, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail, testConnection, resetFirestore } from '../firebase';
import { onAuthStateChanged, signInWithRedirect, signInWithPopup, getRedirectResult, signOut, User, FacebookAuthProvider, OAuthProvider, RecaptchaVerifier, PhoneAuthProvider, updatePhoneNumber, deleteUser, reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider, GoogleAuthProvider } from 'firebase/auth';
import { doc, onSnapshot, setDoc, Timestamp, updateDoc, deleteField, getDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, LogIn, Mail, Facebook, Apple, Chrome, AlertCircle, ArrowLeft, Eye, EyeOff, User as UserIcon, Phone, Lock, CheckCircle2, MapPin, Navigation, X, Bike } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const CURRENT_CACHE_VERSION = '1.1';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  error: string | null;
  isUpdatingRole: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  setRole: (role: 'client' | 'restaurant' | 'driver') => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, phone: string) => Promise<void>;
  sendPhoneCode: (phone: string) => Promise<void>;
  confirmPhoneCode: (phone: string, code: string) => Promise<void>;
  sendVerificationEmail: (email: string) => Promise<void>;
  checkEmailVerification: (email: string, code: string) => Promise<boolean>;
  verifyPhone: (phone: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePhoto: (photoUrl: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  updateSettings: (settings: any) => Promise<void>;
  updateDriverStatus: (isOnline: boolean) => Promise<void>;
  updateDriverProfile: (data: { vehicle: string; plate: string; phone?: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  verifyAccount: () => Promise<void>;
  uploadDriverDocuments: (files: { front: File; back: File; selfie: File }) => Promise<void>;
  setError: (error: string | null) => void;
  isConnectionHealthy: boolean;
  setIsConnectionHealthy: (healthy: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within a FirebaseProvider');
  return context;
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[500] bg-gradient-to-b from-[#8E24AA] to-[#FF5722] flex flex-col items-center justify-center text-center p-10">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
      className="relative w-[120px] h-[120px] flex items-center justify-center mb-8"
    >
      <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
        <defs>
          <mask id="splashPinMask">
            <rect width="24" height="24" fill="white" />
            <path d="M12 6L16 14L12 13L8 14L12 6Z" fill="black" transform="rotate(45 12 10)" />
          </mask>
        </defs>
        <path d="M12 21.7C17.3 17 20 13 20 9C20 4.6 16.4 1 12 1C7.6 1 4 4.6 4 9C4 13 6.7 17 12 21.7Z" fill="white" mask="url(#splashPinMask)"/>
      </svg>
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Ya Voy!</h1>
      <p className="text-white/80 font-bold mt-2 uppercase tracking-widest text-sm">Bienvenido!</p>
      <p className="text-white/40 font-bold mt-8 uppercase tracking-[0.3em] text-[10px]">Desarrollado por Batalla Group</p>
    </motion.div>
    <div className="absolute bottom-12">
      <Loader2 className="animate-spin text-white/50" size={32} />
    </div>
  </div>
);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(() => {
    const cached = localStorage.getItem('user_profile');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isSplashActive, setIsSplashActive] = useState(true);
  const [isConnectionHealthy, setIsConnectionHealthy] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      console.log("Waiting for app to settle before checking connection...");
      // Wait a bit more for the app to settle and network to stabilize in the iframe
      await new Promise(resolve => setTimeout(resolve, 5000));
      const healthy = await testConnection(3, 2000);
      setIsConnectionHealthy(healthy);
    };
    checkConnection();

    const handleOnline = () => {
      console.log("Browser went online, re-testing connection...");
      checkConnection();
    };
    const handleOffline = () => {
      console.log("Browser went offline.");
      setIsConnectionHealthy(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Cache Version Control
    const savedVersion = localStorage.getItem('app_version');
    if (!savedVersion || savedVersion !== CURRENT_CACHE_VERSION) {
      console.log(`Cache version mismatch (Found: ${savedVersion}, Required: ${CURRENT_CACHE_VERSION}). Cleaning...`);
      localStorage.clear();
      localStorage.setItem('app_version', CURRENT_CACHE_VERSION);
    }

    const timer = setTimeout(() => setIsSplashActive(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    let authUnsubscribe: (() => void) | null = null;

    const initAuth = async () => {
      try {
        // 1. Wait for redirect result to settle
        const result = await getRedirectResult(auth);
        if (result?.user && isMounted) {
          console.log("Redirect sign-in successful:", result.user.uid);
          await saveUserProfile(result.user);
        }
      } catch (err: any) {
        console.error("Redirect sign-in error:", err);
        if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/popup-closed-by-user') {
          setError("Error al completar el inicio de sesión. " + (err.message || ''));
        }
      } finally {
        if (!isMounted) return;

        // 2. Start listening to auth state ONLY after redirect check is done
        authUnsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!isMounted) return;
          
          setUser(currentUser);
          if (currentUser) {
            console.log("User logged in, scheduling saveUserProfile for:", currentUser.uid);
            // Wait a bit to ensure Firestore network is ready after login
            setTimeout(async () => {
              if (isMounted) {
                console.log("Executing scheduled saveUserProfile for:", currentUser.uid);
                await saveUserProfile(currentUser);
              }
            }, 1000);
          } else {
            setProfile(null);
          }
          setLoading(false);
        });
      }
    };

    initAuth();

    return () => {
      isMounted = false;
      if (authUnsubscribe) authUnsubscribe();
    };
  }, []);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Sync profile data
  useEffect(() => {
    if (user && isConnectionHealthy) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          // Prevent onSnapshot from overwriting the role if we're in the middle of an update
          if (!isUpdatingRole) {
            setProfile(data);
            localStorage.setItem('user_profile', JSON.stringify(data));
          }
        }
      }, (err) => {
        // Only report if user is still logged in and it's NOT an offline error
        // onSnapshot automatically retries on offline errors, so we shouldn't crash the app
        if (auth.currentUser && !err.message.includes('offline')) {
          handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
        } else {
          console.warn("onSnapshot background error (likely offline, will retry):", err.message);
        }
      });
      return () => unsubscribe();
    }
  }, [user, isUpdatingRole, isConnectionHealthy]);

  const loginWithGoogle = async () => {
    try {
      setError(null);
      // Usamos signInWithPopup porque signInWithRedirect suele fallar en iframes
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await saveUserProfile(result.user);
        window.history.replaceState(null, '', '/');
        toast.success('¡Bienvenido!');
      }
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Google Login Error:', err);
      let msg = 'Error al iniciar sesión con Google.';
      
      if (err.code === 'auth/popup-blocked') {
        msg = 'El navegador bloqueó la ventana emergente. Por favor, permite las ventanas emergentes o intenta abrir la aplicación en una nueva pestaña.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Error de red. Esto suele ocurrir si el navegador bloquea las cookies de terceros. Intenta abrir la aplicación en una nueva pestaña o usar otro navegador.';
      } else if (err.message) {
        msg += ' ' + err.message;
      }
      
      setError(msg);
      toast.error(msg, {
        duration: 10000,
        action: {
          label: 'Abrir en nueva pestaña',
          onClick: () => window.open(window.location.href, '_blank')
        }
      });
    }
  };

  const loginWithApple = async () => {
    try {
      setError(null);
      const provider = new OAuthProvider('apple.com');
      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Apple Login Error:', err);
      setError('Error al iniciar sesión con Apple. Asegúrate de que esté configurado en la consola de Firebase.');
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, pass);
      window.history.replaceState(null, '', '/');
      toast.success('Sesión iniciada con éxito');
    } catch (err: any) {
      console.error('Email Login Error:', err);
      const msg = 'Correo o contraseña incorrectos.';
      setError(msg);
      toast.error(msg);
    }
  };

  const registerWithEmail = async (name: string, email: string, pass: string, phone: string) => {
    try {
      setError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });
      
      // Save full profile
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: name,
        phoneNumber: phone,
        emailVerified: false,
        phoneVerified: false,
        verificado: false,
        role: 'client',
        balance: 0,
        debt: 0,
        onboardingCompleted: false,
        preferences: [],
        settings: {
          notifications: true,
          darkMode: false,
          language: 'es'
        },
        createdAt: Timestamp.now()
      });
      
      window.history.replaceState(null, '', '/');
      toast.success('Cuenta creada con éxito');
      
      // Send welcome email via Resend (background)
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      }).catch(e => console.error("Error sending welcome email:", e));

    } catch (err: any) {
      console.error('Email Register Error:', err);
      let msg = 'Error al crear la cuenta.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo ya está registrado.';
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
      toast.error(msg);
    }
  };

  const sendPhoneCode = async (phone: string) => {
    try {
      setError(null);
      const response = await fetch('/api/verify/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      if (data.demoMode) {
        toast.info(data.message, { duration: 10000 });
        setError(data.message);
      } else {
        setError('Código SMS enviado.');
        toast.success('Código SMS enviado.');
      }
    } catch (err: any) {
      console.error('Send Phone Code Error:', err);
      setError('Error al enviar el código SMS via Twilio: ' + (err.message || ''));
      throw err;
    }
  };

  const confirmPhoneCode = async (phone: string, code: string) => {
    try {
      setError(null);
      const response = await fetch('/api/verify/check-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, code })
      });
      const data = await response.json();
      
      if (data.valid) {
        if (auth.currentUser) {
          const userRef = doc(db, 'users', auth.currentUser.uid);
          await updateDoc(userRef, { 
            phoneNumber: phone,
            phoneVerified: true,
            updatedAt: Timestamp.now()
          });
          setProfile((prev: any) => ({ ...prev, phoneNumber: phone, phoneVerified: true }));
        }
        setError('Número de teléfono verificado con éxito.');
      } else {
        throw new Error('Código inválido');
      }
    } catch (err: any) {
      console.error('Confirm Phone Code Error:', err);
      setError('El código SMS es incorrecto o ha expirado.');
      throw err;
    }
  };

  const verifyPhone = async (phone: string) => {
    // This was the old "fake" function, we now use sendPhoneCode + confirmPhoneCode
    // But keeping it as a fallback or for simple updates if needed
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          phoneNumber: phone,
          phoneVerified: true,
          updatedAt: Timestamp.now()
        });
        setError('Número de teléfono verificado con éxito.');
      } catch (err: any) {
        console.error('Verify Phone Error:', err);
        setError('Error al verificar el teléfono.');
      }
    }
  };

  const sendVerificationEmail = async (email: string) => {
    try {
      setError(null);
      // Specific bypass for testing
      const isBypassUser = profile?.phoneNumber === '7641311374';
      const code = isBypassUser ? '190506' : Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code in temporary state or Firestore for verification
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          emailVerificationCode: code,
          updatedAt: Timestamp.now()
        });
      }

      // If bypass user, don't actually send email to avoid saturation
      if (isBypassUser) {
        toast.success('Modo prueba: Usa el código 190506');
        return;
      }

      const response = await fetch('/api/email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      
      toast.success('Código de verificación enviado a tu correo.');
    } catch (err: any) {
      console.error('Send Email Verification Error:', err);
      // If it's a dev environment or specific user, show a fallback
      if (profile?.phoneNumber === '7641311374') {
        toast.success('Error de envío, pero puedes usar 190506 para verificar.');
        return;
      }
      setError('Error al enviar el código de verificación. Verifica tu conexión.');
      throw err;
    }
  };

  const checkEmailVerification = async (email: string, code: string) => {
    try {
      setError(null);
      if (user) {
        // Allow 190506 as bypass for specific user or 123456 as general bypass
        const isBypassCode = code === "123456" || (code === "190506" && profile?.phoneNumber === '7641311374');
        
        if (profile?.emailVerificationCode === code || isBypassCode) {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { 
            emailVerified: true,
            emailVerificationCode: null,
            updatedAt: Timestamp.now()
          });
          setProfile((prev: any) => ({ ...prev, emailVerified: true }));
          toast.success('Correo verificado con éxito.');
          return true;
        }
      }
      return false;
    } catch (err: any) {
      console.error('Check Email Verification Error:', err);
      setError('Error al verificar el código.');
      return false;
    }
  };

  const verifyEmail = async () => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          emailVerified: true,
          updatedAt: Timestamp.now()
        });
        setError('Correo electrónico verificado con éxito.');
      } catch (err: any) {
        console.error('Verify Email Error:', err);
        setError('Error al verificar el correo.');
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
      toast.success('Correo de restablecimiento enviado. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      let msg = 'Error al enviar el correo de restablecimiento.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No hay ningún usuario registrado con este correo.';
      }
      setError(msg);
      toast.error(msg);
      throw err;
    }
  };

  const updatePhoto = async (photoData: string) => {
    if (user) {
      try {
        console.log("Starting photo update for user:", user.uid);
        
        let finalUrl = photoData;
        
        // If it's a base64 string, try to upload to Storage for cross-device sync
        if (photoData.startsWith('data:image')) {
          try {
            console.log("Attempting Storage upload...");
            const response = await fetch(photoData);
            const blob = await response.blob();
            const storageRef = ref(storage, `profiles/${user.uid}/avatar_${Date.now()}.jpg`);
            
            // Set a shorter timeout for the upload to avoid hanging
            const uploadTask = uploadBytes(storageRef, blob);
            await uploadTask;
            
            finalUrl = await getDownloadURL(storageRef);
            console.log("Uploaded to Storage, URL:", finalUrl);
          } catch (storageErr: any) {
            console.warn("Firebase Storage upload failed, falling back to Firestore base64:", storageErr);
            // If Storage fails (e.g. retry limit exceeded), we use the base64 string directly in Firestore
            // Firestore limit is 1MB, which is enough for a cropped profile pic.
            finalUrl = photoData;
            
            // If the base64 is too long for Firestore (though unlikely for a cropped pic), we might need to compress it more
            if (finalUrl.length > 1000000) {
              console.error("Photo data too large for Firestore fallback (>1MB)");
              throw new Error("La imagen es demasiado grande para guardarla.");
            }
          }
        }

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          photoURL: finalUrl,
          updatedAt: Timestamp.now()
        });
        console.log("Firestore photoURL updated successfully");
        
        // Also update Auth profile for consistency, but ONLY if the URL is not too long (Firebase Auth limit)
        // Note: Auth photoURL has a strict limit (usually ~2000 chars), so base64 will likely fail here.
        if (finalUrl && finalUrl.length < 2000) {
          try {
            await updateProfile(user, { photoURL: finalUrl });
            console.log("Firebase Auth profile photoURL updated successfully");
          } catch (authErr) {
            console.warn("Could not update Auth profile photoURL (likely too long):", authErr);
          }
        }
        
        // Force profile state update locally for immediate feedback
        setProfile((prev: any) => ({ ...prev, photoURL: finalUrl }));
      } catch (err: any) {
        console.error('Update Photo Error:', err);
        setError('Error al actualizar la foto de perfil. ' + (err.message || ''));
        throw err;
      }
    } else {
      console.warn("No user logged in to update photo");
    }
  };

  const updateName = async (name: string) => {
    if (user) {
      try {
        console.log("Starting name update for user:", user.uid, "to:", name);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          displayName: name,
          updatedAt: Timestamp.now()
        });
        console.log("Firestore displayName updated successfully");
        
        await updateProfile(user, { displayName: name });
        console.log("Firebase Auth profile displayName updated successfully");
        
        setProfile((prev: any) => ({ ...prev, displayName: name }));
      } catch (err: any) {
        console.error('Update Name Error:', err);
        setError('Error al actualizar el nombre.');
        throw err;
      }
    } else {
      console.warn("No user logged in to update name");
    }
  };

  const updateSettings = async (settings: any) => {
    if (user) {
      try {
        console.log("Updating settings for user:", user.uid, settings);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          settings: settings,
          updatedAt: Timestamp.now()
        });
        setProfile((prev: any) => ({ ...prev, settings: settings }));
      } catch (err: any) {
        console.error('Update Settings Error:', err);
        setError('Error al actualizar la configuración.');
        throw err;
      }
    }
  };

  const updateDriverStatus = async (isOnline: boolean) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          isOnline: isOnline,
          updatedAt: Timestamp.now()
        });
        setProfile((prev: any) => ({ ...prev, isOnline: isOnline }));
      } catch (err: any) {
        console.error('Update Driver Status Error:', err);
        setError('Error al actualizar estado de disponibilidad.');
        throw err;
      }
    }
  };

  const updateDriverProfile = async (data: { vehicle: string; plate: string; phone?: string; name?: string }) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const updateData: any = { 
          vehicle: data.vehicle,
          plate: data.plate,
          updatedAt: Timestamp.now()
        };
        if (data.phone) updateData.phoneNumber = data.phone;
        if (data.name) {
          updateData.displayName = data.name;
          await updateProfile(user, { displayName: data.name });
        }
        
        await updateDoc(userRef, updateData);
        setProfile((prev: any) => ({ ...prev, ...updateData }));
      } catch (err: any) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        throw err;
      }
    }
  };

  const setRole = async (role: 'client' | 'restaurant' | 'driver') => {
    if (user) {
      setIsUpdatingRole(true);
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          role: role,
          updatedAt: Timestamp.now()
        });
        // Update local state immediately to avoid flicker
        const updatedProfile = { ...profile, role: role };
        setProfile(updatedProfile);
        localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
        
        // Give Firestore a moment to propagate before re-enabling onSnapshot
        setTimeout(() => setIsUpdatingRole(false), 2000);
      } catch (err: any) {
        setIsUpdatingRole(false);
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
        throw err;
      }
    }
  };

  const verifyAccount = async () => {
    if (user) {
      try {
        console.log("Verifying account for user:", user.uid);
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { 
          verificado: true,
          updatedAt: Timestamp.now()
        });
        setProfile((prev: any) => ({ ...prev, verificado: true }));
      } catch (err: any) {
        console.error('Verify Account Error:', err);
        setError('Error al verificar la cuenta.');
        throw err;
      }
    }
  };

  const deleteAccount = async (password?: string) => {
    if (!user) return;
    
    try {
      // Re-authenticate user before deletion
      const providerId = user.providerData[0]?.providerId;
      
      if (providerId === 'password') {
        if (!password) throw new Error("Se requiere la contraseña para confirmar");
        const credential = EmailAuthProvider.credential(user.email!, password);
        await reauthenticateWithCredential(user, credential);
      } else if (providerId === 'google.com') {
        await reauthenticateWithPopup(user, googleProvider);
      } else {
        // Fallback for other providers or if providerData is empty
        throw new Error("Por favor, cierra sesión e inicia sesión de nuevo para realizar esta acción por seguridad.");
      }
      
      const uid = user.uid;
      
      // Delete Firestore data first
      await deleteDoc(doc(db, 'users', uid));
      
      // Delete user from Auth
      await deleteUser(user);
      
      localStorage.removeItem('user_profile');
      setUser(null);
      setProfile(null);
      
      toast.success("Cuenta eliminada correctamente");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/wrong-password') {
        toast.error("Contraseña incorrecta");
        throw new Error("Contraseña incorrecta");
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error("Por seguridad, inicia sesión de nuevo antes de eliminar tu cuenta.");
        throw new Error("Requiere inicio de sesión reciente");
      }
      toast.error(error.message || "Error al eliminar la cuenta");
      throw error;
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('user_profile');
      await signOut(auth);
    } catch (err) {
      console.error('Logout Error:', err);
    }
  };

  const uploadDriverDocuments = async (files: { front: File; back: File; selfie: File }) => {
    if (!user || !profile) throw new Error("No user authenticated");
    setLoading(true);
    try {
      const uploadPromises = Object.entries(files).map(async ([key, file]) => {
        const storageRef = ref(storage, `drivers/${user.uid}/${key}_${Date.now()}`);
        try {
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        } catch (storageErr: any) {
          console.warn(`Storage upload failed for ${key}, falling back to base64 in Firestore:`, storageErr);
          // If Storage fails, convert to base64 and store in Firestore
          // Note: This might hit Firestore's 1MB limit if the file is large
          return new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result as string;
              if (base64.length > 1000000) {
                reject(new Error(`El archivo ${key} es demasiado grande para el respaldo (>1MB).`));
              } else {
                resolve(base64);
              }
            };
            reader.onerror = () => reject(new Error(`Error al leer el archivo ${key}.`));
            reader.readAsDataURL(file);
          });
        }
      });

      const [frontUrl, backUrl, selfieUrl] = await Promise.all(uploadPromises);

      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        'driverProfile.documents': {
          front: frontUrl,
          back: backUrl,
          selfie: selfieUrl,
          uploadedAt: new Date().toISOString(),
          status: 'pending'
        },
        'driverProfile.isVerified': false
      });

      setProfile((prev: any) => prev ? {
        ...prev,
        driverProfile: {
          ...prev.driverProfile,
          documents: {
            front: frontUrl,
            back: backUrl,
            selfie: selfieUrl,
            uploadedAt: new Date().toISOString(),
            status: 'pending'
          },
          isVerified: false
        }
      } : null);

      setError('¡Documentos subidos! Están en revisión.');

      // Trigger OCR Verification in background
      fetch('/api/verify/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frontUrl, 
          registeredName: profile.displayName || profile.nombre || profile.email 
        })
      }).then(res => res.json()).then(async (data) => {
        console.log("OCR Result:", data);
        if (data.match) {
          await updateDoc(docRef, {
            'driverProfile.isVerified': true,
            'driverProfile.documents.status': 'verified',
            'verificado': true,
            updatedAt: Timestamp.now()
          });
          setProfile((prev: any) => ({ 
            ...prev, 
            verificado: true,
            driverProfile: { ...prev.driverProfile, isVerified: true, documents: { ...prev.driverProfile.documents, status: 'verified' } }
          }));
        } else {
          await updateDoc(docRef, {
            'driverProfile.documents.status': 'rejected',
            'driverProfile.documents.rejectionReason': data.reason
          });
        }
      }).catch(err => console.error("Background OCR Error:", err));

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, error, 
      loginWithGoogle, loginWithApple, loginWithEmail, registerWithEmail, 
      sendPhoneCode, confirmPhoneCode, sendVerificationEmail, checkEmailVerification,
      verifyPhone, verifyEmail, sendPasswordReset, updatePhoto, updateName, updateSettings, 
      updateDriverStatus, updateDriverProfile, logout, deleteAccount, verifyAccount, 
      uploadDriverDocuments, setError, setRole, isUpdatingRole,
      isConnectionHealthy, setIsConnectionHealthy
    }}>
      {isSplashActive ? <SplashScreen /> : children}
    </AuthContext.Provider>
  );
};

export const LoginScreen = () => {
  const { loginWithGoogle, loginWithFacebook, loginWithEmail, registerWithEmail, error, setError, isConnectionHealthy, setIsConnectionHealthy } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleGoogle = async () => {
    // No ponemos isLoggingIn(true) aquí inmediatamente para evitar que el re-render bloquee el popup
    try {
      await loginWithGoogle();
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      if (isRegistering) {
        if (!name || !email || !password) {
          toast.error('Por favor completa todos los campos');
          return;
        }
        await registerWithEmail(name, email, password, phone);
      } else {
        if (!email || !password) {
          toast.error('Ingresa correo y contraseña');
          return;
        }
        await loginWithEmail(email, password);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isConnectionHealthy) {
    return (
      <div className="fixed inset-0 z-[300] bg-white p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 bg-amber-50 text-amber-600 rounded-full">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Problema de Conexión</h2>
          <p className="text-slate-500 font-bold">No se pudo establecer conexión con el servidor de base de datos.</p>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">Esto puede deberse a la configuración de red o a que el servicio está temporalmente fuera de línea.</p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button 
            disabled={isLoggingIn}
            onClick={async () => {
              setIsLoggingIn(true);
              const healthy = await testConnection(3, 1000);
              setIsConnectionHealthy(healthy);
              setIsLoggingIn(false);
              if (healthy) toast.success("Conexión restablecida");
              else toast.error("No se pudo conectar. Intenta de nuevo.");
            }}
            className="w-full py-4 bg-[#8E24AA] text-white rounded-2xl font-black uppercase tracking-tighter shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Conectando...
              </>
            ) : 'Reintentar Conexión'}
          </button>
          <button 
            onClick={() => resetFirestore()}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-tighter active:scale-95 transition-all"
          >
            Reiniciar Aplicación
          </button>
        </div>
      </div>
    );
  }

  if (isLoggingIn) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white z-[300]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-[#8E24AA]" size={48} />
          <p className="text-[#8E24AA] font-black italic uppercase tracking-tighter">Procesando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-b from-[#8E24AA] to-[#FF5722] flex flex-col overflow-hidden">
      <div className="relative z-10 flex-1 flex flex-col p-8 justify-between items-center text-center overflow-y-auto">
        {/* Header Section */}
        <div className="mt-12 flex flex-col items-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-[80px] h-[80px] flex items-center justify-center"
          >
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
              <defs>
                <mask id="loginPinMask">
                  <rect width="24" height="24" fill="white" />
                  <path d="M12 6L16 14L12 13L8 14L12 6Z" fill="black" transform="rotate(45 12 10)" />
                </mask>
              </defs>
              <path d="M12 21.7C17.3 17 20 13 20 9C20 4.6 16.4 1 12 1C7.6 1 4 4.6 4 9C4 13 6.7 17 12 21.7Z" fill="white" mask="url(#loginPinMask)"/>
            </svg>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            <h1 className="text-[32px] font-black text-white leading-none italic uppercase tracking-tighter">
              Ya Voy!
            </h1>
            <p className="text-[14px] text-white/80 font-bold uppercase tracking-widest">
              {isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}
            </p>
          </motion.div>
        </div>

        {/* Form/Buttons Section */}
        <div className="w-full max-w-sm space-y-4 my-8">
          {error && (
            <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-2xl flex items-start gap-3 text-xs font-bold animate-in fade-in zoom-in mb-4">
              <AlertCircle size={16} className="shrink-0" />
              <p>{error}</p>
              <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div
                key="social"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <button 
                  onClick={handleGoogle}
                  className="w-full py-4 bg-white text-[#8E24AA] rounded-[30px] font-black uppercase text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-4"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>{isRegistering ? 'Registro con Google' : 'Entrar con Google'}</span>
                </button>

                <button 
                  onClick={() => setShowEmailForm(true)}
                  className="w-full py-4 bg-white/20 backdrop-blur-md text-white border-2 border-white/30 rounded-[30px] font-black uppercase text-sm active:scale-95 transition-all flex items-center justify-center space-x-4"
                >
                  <Mail size={20} />
                  <span>{isRegistering ? 'Registro con Correo' : 'Entrar con Correo'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleEmailSubmit}
                className="space-y-3"
              >
                {isRegistering && (
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nombre completo" 
                      className="w-full p-4 pl-12 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/50 outline-none focus:bg-white/20 transition-all font-bold"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                  <input 
                    type="email" 
                    placeholder="Correo electrónico" 
                    className="w-full p-4 pl-12 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/50 outline-none focus:bg-white/20 transition-all font-bold"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                  <input 
                    type="password" 
                    placeholder="Contraseña" 
                    className="w-full p-4 pl-12 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/50 outline-none focus:bg-white/20 transition-all font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {isRegistering && (
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                    <input 
                      type="tel" 
                      placeholder="Teléfono (opcional)" 
                      className="w-full p-4 pl-12 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/50 outline-none focus:bg-white/20 transition-all font-bold"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                )}
                
                <button 
                  type="submit"
                  className="w-full py-4 bg-white text-[#8E24AA] rounded-[30px] font-black uppercase text-sm shadow-xl active:scale-95 transition-all"
                >
                  {isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión'}
                </button>

                <button 
                  type="button"
                  onClick={() => setShowEmailForm(false)}
                  className="text-white text-xs font-black uppercase opacity-70 hover:opacity-100 transition-opacity"
                >
                  Volver a opciones sociales
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
          >
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-white text-sm font-bold hover:underline underline-offset-4"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes una cuenta? Regístrate aquí'}
            </button>
          </motion.div>

          {/* Footer Section */}
          <div className="pt-8">
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
              Al continuar, aceptas nuestros{' '}
              <a href="#" className="text-white underline underline-offset-2">Términos</a>
              {' '}y{' '}
              <a href="#" className="text-white underline underline-offset-2">Condiciones</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = useState(false);
  const [errorInfo, setErrorInfo] = useState<any>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      try {
        const info = JSON.parse(event.error.message);
        if (info.error && info.operationType) {
          setErrorInfo(info);
          setHasError(true);
        }
      } catch (e) {
        // Not a FirestoreErrorInfo
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="fixed inset-0 z-[300] bg-white p-8 flex flex-col items-center justify-center text-center space-y-6">
        <div className="p-6 bg-red-50 text-red-600 rounded-full">
          <AlertCircle size={48} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Error de Permisos</h2>
          <p className="text-slate-500 font-bold">No tienes permisos suficientes para realizar esta acción.</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl text-left w-full overflow-auto max-h-40">
          <code className="text-xs text-slate-400">{JSON.stringify(errorInfo, null, 2)}</code>
        </div>
        <button 
          onClick={() => setHasError(false)}
          className="px-8 py-4 bg-purple-600 text-white rounded-2xl font-black uppercase tracking-tighter"
        >
          Entendido
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
