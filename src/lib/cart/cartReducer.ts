import { CartItem, CartState, CartAction } from './types';

export function lineKey(
  item: Pick<CartItem, 'productId' | 'variantId' | 'tierQty' | 'threadColour'>
): string {
  return `${item.productId}:${item.variantId}:${item.tierQty}:${item.threadColour}`;
}

export const initialCartState: CartState = {
  items: [],
  isDrawerOpen: false,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.payload };

    case 'ADD_ITEM': {
      const key = lineKey(action.payload);
      const existingIndex = state.items.findIndex(
        (item) => lineKey(item) === key
      );
      let items: CartItem[];
      if (existingIndex !== -1) {
        items = state.items.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
            : item
        );
      } else {
        items = [...state.items, action.payload];
      }
      return { ...state, items, isDrawerOpen: true };
    }

    case 'UPDATE_QTY': {
      const { key, qty } = action.payload;
      if (qty <= 0) {
        return {
          ...state,
          items: state.items.filter((item) => lineKey(item) !== key),
        };
      }
      return {
        ...state,
        items: state.items.map((item) =>
          lineKey(item) === key ? { ...item, quantity: qty } : item
        ),
      };
    }

    case 'REMOVE_ITEM': {
      const { key } = action.payload;
      return {
        ...state,
        items: state.items.filter((item) => lineKey(item) !== key),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };

    case 'OPEN_DRAWER':
      return { ...state, isDrawerOpen: true };

    case 'CLOSE_DRAWER':
      return { ...state, isDrawerOpen: false };

    default:
      return state;
  }
}
