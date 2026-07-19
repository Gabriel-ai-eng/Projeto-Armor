import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Bloqueia o pinch-zoom no iOS: o Safari ignora o user-scalable=no do viewport,
// mas respeita o preventDefault nos eventos de gesto (Android já é bloqueado
// pelo viewport + touch-action:none).
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
