/**
 * wa.me link for a customer's phone number as they typed it at checkout.
 * wa.me needs the full international number without "+" or a leading 0:
 * "0803 111 2222" → 2348031112222, "+234 803 111 2222" → 2348031112222.
 * Returns null when the number can't be turned into one.
 */
export function customerWhatsAppUrl(phone: string, message?: string): string | null {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2) // 00234…
  if (digits.startsWith('234')) {
    // already international; drop a stray 0 after the country code (2340803…)
    digits = '234' + digits.slice(3).replace(/^0/, '')
  } else if (digits.startsWith('0')) {
    digits = '234' + digits.slice(1) // Nigerian local format
  } else if (digits.length === 10) {
    digits = '234' + digits // 803 111 2222
  }
  // Other countries' numbers are left as typed (international customers include their code)
  if (digits.length < 10 || digits.length > 15) return null
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}
