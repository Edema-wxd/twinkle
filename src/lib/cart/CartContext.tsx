'use client';

import { createContext, useContext, useReducer, useEffect } from 'react';
import { cartReducer, initialCartState } from './cartReducer';
import type { CartState, CartAction } from './types';

interface CartContextValue {
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'twinkle_cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  // Rehydrate from localStorage after mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    let items: CartState['items'] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) items = parsed;
      }
    } catch {
      // Corrupt storage — start fresh
    }
    // Always dispatch so `hydrated` flips even for an empty cart
    dispatch({ type: 'HYDRATE', payload: items });
  }, []);

  // Persist items to localStorage on change (drawer state not persisted)
  useEffect(() => {
    if (!state.hydrated) return; // don't overwrite storage with the empty initial state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // Storage unavailable — ignore
    }
  }, [state.items, state.hydrated]);

  return (
    <CartContext.Provider value={{ state, dispatch }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
}
