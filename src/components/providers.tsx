'use client';

import { CartProvider } from '@/lib/cart/CartContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
