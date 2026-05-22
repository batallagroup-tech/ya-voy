import React from 'react';
import ReactDOM from 'react-dom/client';
import DriverApp from './DriverApp';
import './index.css';
import { FirebaseProvider } from './components/FirebaseProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FirebaseProvider>
      <DriverApp />
    </FirebaseProvider>
  </React.StrictMode>
);
