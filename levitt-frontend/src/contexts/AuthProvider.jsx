// src/contexts/AuthProvider.jsx
import React, { useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { AuthContext } from './AuthContext'; // Importa o contexto do arquivo ao lado

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedUser = jwtDecode(token);
        setUser(decodedUser);
        setIsLoggedIn(true);
      } catch (error) {
        console.error("Falha ao decodificar o token:", error);
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  const login = (token) => {
    localStorage.setItem('authToken', token);
    const decodedUser = jwtDecode(token);
    setUser(decodedUser);
    setIsLoggedIn(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    setIsLoggedIn(false);
  };

  const updateUserContext = (newUserData) => {
    setUser(prevUser => ({ ...prevUser, ...newUserData }));
  };

  const value = { user, isLoggedIn, login, logout, updateUserContext };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};