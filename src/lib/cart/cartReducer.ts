import { CartItem, CartState, CartAction } from './types';

export function lineKey(
  item: Pick<CartItem, 'productId' | 'variantId' | 'tierQty' | 'threadColour'>
): string {
  return `${item.productId}:${item.variantId}:${item.tierQty}:${item.threadColour}`;
}

export const initialCartState: CartState = {
  items: [],
  isDrawerOpen: false,
  hydrated: false,
};

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, items: action.payload, hydrated: true };

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

    case 'RESTORE_ITEM': {
      const { item, index } = action.payload;
      const key = lineKey(item);
      // Re-added in the meantime: merge rather than create a duplicate line
      if (state.items.some((i) => lineKey(i) === key)) {
        return {
          ...state,
          items: state.items.map((i) => (lineKey(i) === key ? { ...i, quantity: Math.min(i.quantity + item.quantity, 10) } : i)),
        };
      }
      const items = [...state.items];
      items.splice(Math.max(0, Math.min(index, items.length)), 0, item);
      return { ...state, items };
    }

    case 'REPRICE':
      return {
        ...state,
        items: state.items.map((item) => {
          const price = action.payload[lineKey(item)]
          return typeof price === 'number' ? { ...item, unitPrice: price } : item
        }),
      };

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
