'use client';

import { usePathname } from 'next/navigation';
import { CartProvider } from '@/lib/cart/CartContext';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { Tracking } from '@/components/tracking/Tracking';

export function Providers({ children }: { children: React.ReactNode }) {
  // The admin has no shopping cart: don't mount the drawer (and its focus trap) there
  const isAdmin = usePathname()?.startsWith('/admin') ?? false;
  return (
    <CartProvider>
      {children}
      {!isAdmin && <CartDrawer />}
      {/* Ad tracking + cookie banner (storefront only; does nothing until a pixel ID is set) */}
      <Tracking />
    </CartProvider>
  );
}
