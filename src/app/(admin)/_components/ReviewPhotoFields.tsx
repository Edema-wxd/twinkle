// Used inside the client review form and table (no hooks here, so no 'use client' needed)
export { CITY_MAX } from '@/app/api/admin/reviews/photoFields'

/** The written-permission checkbox for photo reviews (form and table edit row) */
export function PhotoPermissionField({
  id,
  checked,
  onChange,
  hasPhoto,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  hasPhoto: boolean
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-gold" />
      <span>
        <span className="block text-sm text-stone-200">The customer gave written permission to show their photo and first name</span>
        <span className="block text-xs text-stone-500">
          {hasPhoto
            ? 'Only tick this when you have it in writing (WhatsApp or email is fine). With a photo and this ticked, the review can show on the ad landing page.'
            : 'Needed, along with a photo, for the review to show on the ad landing page.'}
        </span>
      </span>
    </label>
  )
}

/** Shown when a review has a photo and permission, so it can appear on the ad landing page */
export function OnLandingBadge() {
  return (
    <span className="inline-block whitespace-nowrap rounded-full bg-emerald-900/60 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
      On landing page
    </span>
  )
}
