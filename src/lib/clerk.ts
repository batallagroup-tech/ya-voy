// Clerk maneja todo el auth: login, registro, sesion, Google OAuth
// Documentacion: https://clerk.com/docs/quickstarts/react

// En main.tsx envuelve tu app con ClerkProvider:
//
// import { ClerkProvider } from '@clerk/clerk-react'
// const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
//
// <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
//   <App />
// </ClerkProvider>

// Hooks utiles en tus componentes:
// import { useUser, useAuth, SignIn, SignUp, UserButton } from '@clerk/clerk-react'

// useUser()  -> datos del usuario actual
// useAuth()  -> getToken(), isSignedIn, userId
// <SignIn /> -> pantalla de login lista
// <SignUp /> -> pantalla de registro lista
// <UserButton /> -> boton de perfil con logout

export const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Falta VITE_CLERK_PUBLISHABLE_KEY en .env')
}
