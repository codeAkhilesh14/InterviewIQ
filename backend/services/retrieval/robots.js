import robotsParser from "robots-parser"

const cache = new Map()
const CACHE_TTL_MS = 10 * 60 * 1000

// Fetches and caches robots.txt for an origin. Fails open (allows fetching) if
// robots.txt is missing or unreachable, since that is the standard convention -
// but respects it whenever a site does publish one.
export const isAllowedByRobots = async (targetUrl, userAgent) => {
    const origin = new URL(targetUrl).origin
    const cached = cache.get(origin)

    let robots
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        robots = cached.robots
    } else {
        try {
            const res = await fetch(`${origin}/robots.txt`, {
                headers: { "User-Agent": userAgent },
                signal: AbortSignal.timeout(5000)
            })
            const body = res.ok ? await res.text() : ""
            robots = robotsParser(`${origin}/robots.txt`, body)
        } catch {
            robots = robotsParser(`${origin}/robots.txt`, "")
        }
        cache.set(origin, { robots, fetchedAt: Date.now() })
    }

    const allowed = robots.isAllowed(targetUrl, userAgent)
    // robots-parser returns undefined when it can't determine - treat as allowed.
    return allowed !== false
}
