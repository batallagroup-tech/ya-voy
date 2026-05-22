import React from 'react'
import ReactDOM from 'react-dom/client'
import RestaurantApp from './RestaurantApp'
import { FirebaseProvider } from './components/FirebaseProvider'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseProvider>
      <RestaurantApp />
    </FirebaseProvider>
  </React.StrictMode>,
)
