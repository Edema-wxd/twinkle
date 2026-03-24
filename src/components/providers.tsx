'use client';

import { CartProvider } from '@/lib/cart/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
      <CartDrawer />
    </CartProvider>
  );
}
