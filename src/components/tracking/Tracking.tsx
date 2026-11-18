'use client'

import { usePathname } from 'next/navigation'
import { ConsentBanner } from './ConsentBanner'
import { PixelLoader } from './PixelLoader'
import { UtmCapture } from './UtmCapture'

/** Storefront-wide ad tracking: UTM capture, the pixels and the cookie banner. Never in the admin. */
export function Tracking() {
  const pathname = usePathname() ?? ''
  if (pathname.startsWith('/admin')) return null
  return (
    <>
      <UtmCapture />
      <PixelLoader />
      <ConsentBanner />
    </>
  )
}
