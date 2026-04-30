/**
 * Shipping zone logic for Twinkle Locs checkout.
 * Lagos: ₦3,000 flat rate
 * All other Nigerian states: ₦4,500 flat rate
 */

export const NIGERIAN_STATES: string[] = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

/**
 * Returns shipping cost in Naira based on delivery state.
 * Lagos: 3000, all other states: 4500.
 */
export function getShippingCost(state: string): number {
  return state === 'Lagos' ? 6000 : 9500;
}
