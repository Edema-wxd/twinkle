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
}

export type CartAction =
  | { type: 'HYDRATE'; payload: CartItem[] }
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QTY'; payload: { key: string; qty: number } }
  | { type: 'REMOVE_ITEM'; payload: { key: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'OPEN_DRAWER' }
  | { type: 'CLOSE_DRAWER' };
