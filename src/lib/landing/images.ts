/**
 * Hosts next/image may optimise (must match images.remotePatterns in next.config.ts).
 * Anything else an admin pastes in renders unoptimised instead of crashing the page.
 */
const OPTIMISABLE_HOSTS = ['ta1u3ge9om.ufs.sh']

export function canOptimise(src: string): boolean {
  if (src.startsWith('/') && !src.startsWith('//')) return true
  try {
    const u = new URL(src)
    return u.protocol === 'https:' && OPTIMISABLE_HOSTS.includes(u.hostname) && u.pathname.startsWith('/f/')
  } catch {
    return false
  }
}
