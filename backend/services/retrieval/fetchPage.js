import { assertSafeUrl } from "./urlSafety.js"
import { isAllowedByRobots } from "./robots.js"

const MAX_BYTES = 2 * 1024 * 1024 // 2MB cap on any single fetched page
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml", "text/plain"]
const REQUEST_TIMEOUT_MS = 10000
const MAX_RETRIES = 3
const MIN_INTERVAL_PER_HOST_MS = 800 // be polite - one request in flight per host at a time, spaced out

const lastRequestAtByHost = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForHostSlot = async (host) => {
    const lastAt = lastRequestAtByHost.get(host) || 0
    const elapsed = Date.now() - lastAt
    if (elapsed < MIN_INTERVAL_PER_HOST_MS) {
        await sleep(MIN_INTERVAL_PER_HOST_MS - elapsed)
    }
    lastRequestAtByHost.set(host, Date.now())
}

// Fetches a single URL with SSRF validation, robots.txt compliance, a per-host rate
// limit, content-type/size restrictions, and retry-with-backoff on 429/5xx/timeouts.
// Returns { ok: true, html, finalUrl } or { ok: false, code, message }.
export const fetchPage = async (rawUrl, { userAgent, respectRobots = true } = {}) => {
    const safety = await assertSafeUrl(rawUrl)
    if (!safety.safe) {
        return { ok: false, code: "UNSAFE_URL", message: `Refusing to fetch (${safety.reason}): ${rawUrl}` }
    }

    const agent = userAgent || process.env.CRAWLER_USER_AGENT || "InterviewIQBot/1.0"

    if (respectRobots) {
        const allowed = await isAllowedByRobots(safety.url.toString(), agent).catch(() => true)
        if (!allowed) {
            return { ok: false, code: "ROBOTS_DISALLOWED", message: `Disallowed by robots.txt: ${rawUrl}` }
        }
    }

    let attempt = 0
    let lastError = null

    while (attempt <= MAX_RETRIES) {
        await waitForHostSlot(safety.url.host)

        try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

            const res = await fetch(safety.url.toString(), {
                headers: { "User-Agent": agent, Accept: "text/html,application/xhtml+xml" },
                redirect: "follow",
                signal: controller.signal
            })
            clearTimeout(timeout)

            if (res.status === 429 || res.status >= 500) {
                const retryAfter = Number(res.headers.get("retry-after")) * 1000
                const backoff = Number.isFinite(retryAfter) && retryAfter > 0
                    ? retryAfter
                    : 500 * 2 ** attempt + Math.random() * 250
                lastError = { code: res.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR", message: `HTTP ${res.status} from ${rawUrl}` }
                attempt += 1
                if (attempt > MAX_RETRIES) break
                await sleep(backoff)
                continue
            }

            if (!res.ok) {
                return { ok: false, code: "HTTP_ERROR", message: `HTTP ${res.status} from ${rawUrl}` }
            }

            const contentType = (res.headers.get("content-type") || "").split(";")[0].trim()
            if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
                return { ok: false, code: "UNSUPPORTED_CONTENT_TYPE", message: `Unsupported content-type ${contentType} for ${rawUrl}` }
            }

            const contentLength = Number(res.headers.get("content-length"))
            if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
                return { ok: false, code: "TOO_LARGE", message: `Response too large for ${rawUrl}` }
            }

            // Stream with a hard cap in case content-length was absent or lied about.
            const reader = res.body?.getReader ? res.body.getReader() : null
            let html
            if (reader) {
                const chunks = []
                let received = 0
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break
                    received += value.length
                    if (received > MAX_BYTES) {
                        await reader.cancel().catch(() => {})
                        return { ok: false, code: "TOO_LARGE", message: `Response exceeded size cap for ${rawUrl}` }
                    }
                    chunks.push(value)
                }
                html = Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8")
            } else {
                html = await res.text()
            }

            return { ok: true, html, finalUrl: res.url || rawUrl }
        } catch (error) {
            lastError = { code: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR", message: `${error.message} (${rawUrl})` }
            attempt += 1
            if (attempt > MAX_RETRIES) break
            await sleep(500 * 2 ** attempt + Math.random() * 250)
        }
    }

    return { ok: false, ...(lastError || { code: "UNKNOWN_ERROR", message: `Failed to fetch ${rawUrl}` }) }
}
