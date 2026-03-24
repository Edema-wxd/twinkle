/**
 * Single source of truth for all Twinkle Locs business details.
 * Edit this file — nowhere else.
 */
export const BUSINESS = {
  name: 'Twinkle Locs',

  whatsapp: {
    /** E.164 without the + prefix — used in wa.me links */
    number: '2348000000000',
    url(message?: string) {
      const base = `https://wa.me/${BUSINESS.whatsapp.number}`;
      return message ? `${base}?text=${encodeURIComponent(message)}` : base;
    },
  },

  instagram: {
    handle: 'twinklelocs',
    url: 'https://instagram.com/twinklelocs',
  },

  support: {
    email: 'hello@twinklelocs.com',
  },
} as const;
