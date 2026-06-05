import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

interface FirebaseUser {
  fullName: string | null;
  firstName: string | null;
  imageUrl: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
}

export interface UseFirebaseAuth {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  user: FirebaseUser | null;
  signOut: () => Promise<void>;
}

export function useFirebaseAuth(): UseFirebaseAuth {
  const [isLoaded, setIsLoaded] = useState(false);
  const [fbUser, setFbUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setIsLoaded(true);
    });
    return unsub;
  }, []);

  return {
    isLoaded,
    isSignedIn: !!fbUser,
    userId: fbUser?.uid ?? null,
    getToken: () => fbUser?.getIdToken() ?? Promise.resolve(null),
    user: fbUser
      ? {
          fullName: fbUser.displayName,
          firstName: fbUser.displayName?.split(" ")[0] ?? null,
          imageUrl: fbUser.photoURL,
          primaryEmailAddress: fbUser.email ? { emailAddress: fbUser.email } : null,
        }
      : null,
    signOut: () => fbSignOut(auth),
  };
}
