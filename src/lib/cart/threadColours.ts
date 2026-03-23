export const THREAD_COLOURS = [
  { id: 'red', label: 'Red', hex: '#C0392B' },
  { id: 'black', label: 'Black', hex: '#1A1A1A' },
  { id: 'light-brown', label: 'Light Brown', hex: '#A0785A' },
  { id: 'blonde', label: 'Blonde', hex: '#D4A853' },
  { id: 'dark-brown', label: 'Dark Brown', hex: '#5C3317' },
] as const;

export type ThreadColourId = (typeof THREAD_COLOURS)[number]['id'];
