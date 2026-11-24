import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { request } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [token, setToken] = useState(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const [u, t] = await Promise.all([
          AsyncStorage.getItem('pixel-user'),
          AsyncStorage.getItem('pixel-token'),
        ]);
        if (u && t) {
          setUser(JSON.parse(u));
          setToken(t);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const save = async (data) => {
    await AsyncStorage.multiSet([
      ['pixel-user', JSON.stringify(data.user)],
      ['pixel-token', data.token],
    ]);
    setUser(data.user);
    setToken(data.token);
  };
  const login = async (email, password) =>
    save(
      await request('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    );
  const signup = async (name, email, password) =>
    save(
      await request('/api/auth/signup', {
        method: 'POST',
        body: { name, email, password },
      }),
    );
  const logout = async () => {
    try {
      if (token) await request('/api/auth/logout', { method: 'POST', token });
    } catch {}
    await AsyncStorage.multiRemove(['pixel-user', 'pixel-token']);
    setUser(null);
    setToken(null);
  };
  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
