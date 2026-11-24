import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useAuth } from './AuthContext';
import { request } from './api';

const C = createContext(null);
export const useCart = () => useContext(C);

export function CartProvider({ children }) {
  const { token } = useAuth();
  const [cart, setCart] = useState({ items: [], totalCents: 0 }),
    [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!token) {
      setCart({ items: [], totalCents: 0 });
      return;
    }
    setLoading(true);
    try {
      setCart(await request('/api/cart', { token }));
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);
  const add = async (productId, quantity = 1) => {
    setCart(
      await request('/api/cart/items', {
        method: 'POST',
        token,
        body: { productId, quantity },
      }),
    );
  };
  const change = async (productId, quantity) => {
    setCart(
      await request(`/api/cart/items/${productId}`, {
        method: 'PUT',
        token,
        body: { quantity },
      }),
    );
  };
  const remove = async (productId) => {
    setCart(
      await request(`/api/cart/items/${productId}`, {
        method: 'DELETE',
        token,
      }),
    );
  };
  return (
    <C.Provider value={{ cart, loading, refresh, add, change, remove }}>
      {children}
    </C.Provider>
  );
}
