import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, doc, getDoc, setDoc, collection, query, where, onSnapshot, getDocFromServer, Timestamp, terminate, clearIndexedDbPersistence, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Use initializeFirestore with long polling and memory cache for maximum reliability in this environment
// We pass the databaseId from config to ensure we connect to the correct instance
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: memoryLocalCache(),
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Force network connection on startup
const ensureNetwork = async () => {
  try {
    console.log("Ensuring Firestore network is enabled...");
    await enableNetwork(db);
  } catch (err) {
    console.warn("Initial enableNetwork failed (expected if already enabled):", err);
  }
};
ensureNetwork();

export const storage = getStorage(app);
export const auth = getAuth(app);

// Set persistence explicitly to help with iframe issues
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.error('Auth persistence error:', err);
  });
}

// Auth Providers
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Auth Functions
export { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendEmailVerification, sendPasswordResetEmail };

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error('Raw Firestore Error:', error);
  
  // Ignore "Firestore shutting down" errors as they are expected during unmount/reload
  if (errorMessage.includes('Firestore shutting down')) {
    console.warn('Firestore shutting down, ignoring error for path:', path);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation Connection to Firestore
export async function testConnection(retries = 3, delay = 2000) {
  console.log("Starting Firestore connection test...");
  console.log("Browser Online State:", navigator.onLine);
  
  for (let i = 0; i < retries; i++) {
    try {
      // Try to force network on before each attempt if it failed before
      if (i > 0 || !navigator.onLine) {
        console.log(`Attempt ${i + 1}: Cycling network (Online: ${navigator.onLine})...`);
        try {
          await disableNetwork(db);
          await new Promise(resolve => setTimeout(resolve, 1500));
          await enableNetwork(db);
          console.log("Network cycle completed.");
        } catch (e) {
          console.warn("Network cycle failed:", e);
        }
      }

      // Use getDocFromServer to bypass any cache and force a network check
      // We use a collection that is likely to exist or at least be valid
      const testDoc = doc(db, 'viveres', 'connectivity_test');
      await getDocFromServer(testDoc);
      console.log("Firestore connection successful (reached server).");
      return true;
    } catch (error: any) {
      const msg = error?.message || String(error);
      
      // If it's just "not found", the connection is actually working
      if (msg.includes('not-found') || error?.code === 'not-found') {
        console.log("Firestore connection successful (reached backend).");
        return true;
      }
      
      // If it's a permission error, the connection is working
      if (msg.includes('permission-denied') || error?.code === 'permission-denied' || msg.includes('insufficient permissions')) {
        console.log("Firestore connection successful (reached backend, permission denied).");
        return true;
      }

      console.warn(`Firestore connection attempt ${i + 1} failed:`, msg);
      
      if (i < retries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      } else {
        console.error("Firestore connection test failed after retries:", error);
        return false;
      }
    }
  }
  return false;
}

// Helper to reset Firestore if needed
export async function resetFirestore() {
  try {
    await terminate(db);
    await clearIndexedDbPersistence(db);
    console.log("Firestore reset successful.");
    window.location.reload();
  } catch (error) {
    console.error("Error resetting Firestore:", error);
  }
}

// testConnection(); // Don't call at top level to avoid "Firestore shutting down" errors during initialization/reloads

// Helper to save user profile with retries
export const saveUserProfile = async (user: User, retries = 3) => {
  console.log("Saving user profile for:", user.uid);
  const userRef = doc(db, 'users', user.uid);
  
  for (let i = 0; i < retries; i++) {
    try {
      // Check if browser thinks it's online
      if (!navigator.onLine) {
        console.warn("Browser reports offline, waiting for connection...");
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Use getDoc with memory cache. Since we use memoryLocalCache, 
      // the first call will always attempt to fetch from server.
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        console.log("Creating new user profile...");
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          phoneNumber: user.phoneNumber,
          emailVerified: user.emailVerified,
          phoneVerified: !!user.phoneNumber,
          verificado: false,
          role: 'client', // Default role
          balance: 0,
          points: 1250, // Initial points as requested
          debt: 0,
          referralCode: `YAVOY-${(user.displayName || 'VIP').toUpperCase().split(' ')[0]}-2024`,
          referralCount: 0,
          referralRewards: 0,
          hasUsedReferral: false,
          onboardingCompleted: false,
          preferences: [],
          settings: {
            notifications: true,
            darkMode: false,
            language: 'es'
          },
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
      } else {
        console.log("Updating existing user profile...");
        const existingData = userDoc.data();
        const updateData: any = {
          email: user.email,
          displayName: user.displayName || existingData?.displayName,
          photoURL: user.photoURL || existingData?.photoURL,
          emailVerified: user.emailVerified,
          updatedAt: Timestamp.now()
        };

        if (!existingData?.referralCode) {
          updateData.referralCode = `YAVOY-${(user.displayName || 'VIP').toUpperCase().split(' ')[0]}-2024`;
          updateData.referralCount = existingData?.referralCount || 0;
          updateData.referralRewards = existingData?.referralRewards || 0;
          updateData.hasUsedReferral = existingData?.hasUsedReferral || false;
          if (existingData?.points === undefined) {
            updateData.points = 1250;
          }
        }

        await setDoc(userRef, updateData, { merge: true });
      }
      console.log("User profile saved successfully.");
      return; // Success
    } catch (error: any) {
      console.warn(`saveUserProfile attempt ${i + 1} failed:`, error.message);
      
      if (error.message.includes('offline') || error.code === 'unavailable') {
        console.log("Cycling network to recover...");
        try {
          await disableNetwork(db);
          await new Promise(resolve => setTimeout(resolve, 1000));
          await enableNetwork(db);
        } catch (e) {
          console.error("Failed to cycle network:", e);
        }
        
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
          continue;
        }
      }
      
      // If we're here, it's either not an offline error or we've exhausted retries
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
      break;
    }
  }
};
