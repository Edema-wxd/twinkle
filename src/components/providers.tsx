'use client';

import { usePathname } from 'next/navigation';
import { CartProvider } from '@/lib/cart/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';

export function Providers({ children }: { children: React.ReactNode }) {
  // The admin has no shopping cart: don't mount the drawer (and its focus trap) there
  const isAdmin = usePathname()?.startsWith('/admin') ?? false;
  return (
    <CartProvider>
      {children}
      {!isAdmin && <CartDrawer />}
    </CartProvider>
  );
}
