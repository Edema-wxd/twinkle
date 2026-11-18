import { eq } from 'drizzle-orm'
import { db, settings } from '@/db'
import { DEFAULT_LANDING_CONFIG, LANDING_SETTINGS_KEY, parseLandingConfig, type LandingConfig } from './config'

/**
 * The landing page's editable content from Admin → Ad landing page.
 * Never throws: with nothing saved yet (or a database hiccup) the defaults are used,
 * so the page still renders.
 */
export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const [row] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, LANDING_SETTINGS_KEY)).limit(1)
    if (!row) return parseLandingConfig(null)
    return parseLandingConfig(JSON.parse(row.value))
  } catch (err) {
    console.error('[landing] failed to load the landing page settings, using defaults:', err)
    return structuredClone(DEFAULT_LANDING_CONFIG)
  }
}

/** Save the whole config (already parsed/validated) */
export async function saveLandingConfig(config: LandingConfig): Promise<void> {
  const value = JSON.stringify(parseLandingConfig(config))
  await db
    .insert(settings)
    .values({ key: LANDING_SETTINGS_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
}
