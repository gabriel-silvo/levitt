// src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuth } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import HomePage from './components/HomePage';
import AccountPage from './components/AccountPage';
import './App.css';

const GOOGLE_CLIENT_ID = "714055899330-glppheb0obn5hmt3i24337u7ussq2joj.apps.googleusercontent.com";

const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth(); // Usamos o estado do nosso contexto
  return isLoggedIn ? children : <Navigate to="/login" />;
};

function App() {
  const { isLoggedIn } = useAuth(); // Pega o estado do contexto

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* A classe do App agora pode ser simplificada */}
      <div className={isLoggedIn ? "App App--loggedin" : "App App--loggedout"}>
        <Routes>
          <Route path="/login" element={isLoggedIn ? <Navigate to="/" /> : <LoginPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </GoogleOAuthProvider>
  );
}

export default App;