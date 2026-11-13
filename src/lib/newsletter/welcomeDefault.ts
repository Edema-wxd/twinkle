import type { NewsletterContent } from './template'

/** Browser-safe: the admin's "Reset to default" uses this too. */
export type WelcomeSettings = { enabled: boolean; content: NewsletterContent }

export const DEFAULT_WELCOME: WelcomeSettings = {
  enabled: true,
  content: {
    subject: 'Welcome to the Twinkle family, {name}',
    preheader: 'Here’s what to expect from us',
    heroImageUrl: null,
    bodyHtml:
      '<p>Hi {name},</p>' +
      '<p>Thank you for joining the Twinkle Locs newsletter. We’re so glad you’re here.</p>' +
      '<p>Here’s what you’ll get from us:</p>' +
      '<ul><li><p>Styling ideas and loc care guides</p></li><li><p>First word when new beads land or sizes come back in stock</p></li><li><p>The occasional subscriber-only offer</p></li></ul>' +
      '<p>Every bead is handcrafted in Nigeria. Have a look around the collection, and message us on WhatsApp any time if you need help choosing.</p>' +
      '<p>With love,<br>Unoma and the Twinkle Locs family</p>',
    ctaLabel: 'Shop the collection',
    ctaUrl: '/catalog',
  },
}
