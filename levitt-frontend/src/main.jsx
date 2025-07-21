// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Importe o BrowserRouter
import { AuthProvider } from './contexts/AuthProvider.jsx'; // Importe o AuthProvider
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider> {/* Envolve o App */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);