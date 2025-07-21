// src/hooks/useAuth.jsx
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext'; // Garanta que este caminho está correto

export const useAuth = () => {
  return useContext(AuthContext);
};