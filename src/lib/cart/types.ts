export interface CartItem {
  productId: string;
  variantId: string;
  tierQty: number;
  threadColour: string; // empty string for Tools
  productName: string;
  variantName: string;
  unitPrice: number; // price in Naira
  imageUrl: string;
  isTool: boolean;
  quantity: number; // 1–10
}

export interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  /** False until localStorage has been read. Gate redirects/empty states on it. */
  hydrated: boolean;
}

export type CartAction =
  | { type: 'HYDRATE'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QTY'; payload: { key: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: { key: string } }
  | { type: 'RESTORE_ITEM'; payload: { item: CartItem; index: number } } // undo a removal, back in its old place
  | { type: 'REPRICE'; payload: Record<string, number> } // lineKey → current server price
  | { type: 'CLEAR_CART' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' };
