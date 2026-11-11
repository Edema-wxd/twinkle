'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from './CartContext';
import { lineKey } from './cartReducer';
import type { CartItem } from './types';

const UNDO_MS = 8_000;

/**
 * Remove a cart line but keep it for a few seconds so it can be put back,
 * in the same place, with "Undo". Used by the cart page and the cart drawer.
 */
export function useRemoveWithUndo() {
  const { state, dispatch } = useCart();
  const [removed, setRemoved] = useState<{ item: CartItem; index: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setRemoved(null);
  }, []);

  const remove = useCallback(
    (key: string) => {
      const index = state.items.findIndex((i) => lineKey(i) === key);
      if (index === -1) return;
      const item = state.items[index];
      dispatch({ type: 'REMOVE_ITEM', payload: { key } });
      setRemoved({ item, index });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setRemoved(null), UNDO_MS);
    },
    [state.items, dispatch],
  );

  const undo = useCallback(() => {
    if (!removed) return;
    dispatch({ type: 'RESTORE_ITEM', payload: removed });
    dismiss();
  }, [removed, dispatch, dismiss]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { removed: removed?.item ?? null, remove, undo, dismiss };
}
