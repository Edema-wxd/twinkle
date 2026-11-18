/**
 * Photo review fields for the admin reviews API (wire names photo_url, city,
 * photo_permission). Only fields present in the body are returned, so an update
 * that leaves one out keeps what's saved.
 */

export const CITY_MAX = 60

export type PhotoFields = {
  photoUrl?: string | null
  city?: string | null
  photoPermission?: boolean
}

export type PhotoFieldsResult = { ok: true; fields: PhotoFields } | { ok: false; error: string }

/** Photos must be ones uploaded here (UploadThing, https), so the page can always show them */
export function isUploadedPhotoUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && (u.hostname.endsWith('.ufs.sh') || u.hostname === 'utfs.io')
  } catch {
    return false
  }
}

export function parsePhotoFields(body: Record<string, unknown>): PhotoFieldsResult {
  const fields: PhotoFields = {}

  if ('photo_url' in body) {
    const v = body.photo_url
    if (v === null || v === '') fields.photoUrl = null
    else if (typeof v === 'string' && v.trim().length <= 1000 && isUploadedPhotoUrl(v.trim())) fields.photoUrl = v.trim()
    else return { ok: false, error: 'photo_url must be a photo uploaded in Admin (an https UploadThing link)' }
  }

  if ('city' in body) {
    const v = body.city
    if (v === null) fields.city = null
    else if (typeof v === 'string' && v.trim().length <= CITY_MAX) fields.city = v.trim() || null
    else return { ok: false, error: `city must be text of ${CITY_MAX} characters or fewer` }
  }

  if ('photo_permission' in body) {
    if (typeof body.photo_permission !== 'boolean') return { ok: false, error: 'photo_permission must be true or false' }
    fields.photoPermission = body.photo_permission
  }

  return { ok: true, fields }
}
