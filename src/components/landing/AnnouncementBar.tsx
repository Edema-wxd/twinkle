import { Copy } from './Copy'

/**
 * The offer, before anything else. Admin → Ad landing page can set the text;
 * left empty it's built from Admin → Shipping (see lib/landing/announcement.ts),
 * so it always matches checkout and the admin preview.
 */
export { announcementText } from '@/lib/landing/announcement'

/** Full-width forest strip, 36 px (two short lines on the narrowest phones), not dismissible */
export function AnnouncementBar({ text }: { text: string }) {
  return (
    <div className="border-b border-cream/10 bg-forest text-cream">
      <p className="mx-auto flex min-h-9 max-w-[1120px] items-center justify-center px-4 py-0.5 text-center font-heading text-[13px] font-medium leading-[1.2] text-balance">
        <span>
          <Copy text={text} />
        </span>
      </p>
    </div>
  )
}
