import { LANDING_PATH } from './config'

/**
 * /lp and /lp/<hero key>: short ad links. 308 to the landing page with the query
 * string kept, so the UTM tags on the ad link survive. The Location is relative,
 * so it never points at an internal host behind the proxy.
 */
export function landingRedirect(request: Request, heroKey?: string): Response {
  const { search } = new URL(request.url)
  const path = heroKey ? `${LANDING_PATH}/${encodeURIComponent(heroKey)}` : LANDING_PATH
  return new Response(null, { status: 308, headers: { Location: path + search } })
}
