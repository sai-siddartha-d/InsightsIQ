// src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';


export const AuthContext = createContext(null);


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = user !== null;

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authApi.me()
      .then((u) => { setUser(u); })
      .catch(() => { setUser(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}