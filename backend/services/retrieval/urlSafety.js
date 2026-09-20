import dns from "node:dns/promises"
import net from "node:net"

// Blocks SSRF-style requests to internal infrastructure. Section 11 of the brief:
// "reject private and loopback addresses in production". In non-production we allow
// an opt-in escape hatch (ALLOW_PRIVATE_HOSTS=true) because the batch entry point
// (Appendix B) is tested against a company_url like http://localhost:8099/acme/.
const PRIVATE_IPV4_RANGES = [
    /^0\./, /^10\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^127\./,
    /^169\.254\./, /^172\.(1[6-9]|2\d|3[01])\./, /^192\.0\.0\./, /^192\.168\./,
    /^198\.1[89]\./, /^224\./, /^255\.255\.255\.255$/
]

const isPrivateIp = (ip) => {
    if (net.isIPv4(ip)) {
        return PRIVATE_IPV4_RANGES.some((re) => re.test(ip))
    }
    if (net.isIPv6(ip)) {
        const lower = ip.toLowerCase()
        return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") ||
            lower.startsWith("fe80") || lower === "::" || lower.startsWith("::ffff:127.")
    }
    return false
}

const allowPrivateHosts = () =>
    process.env.NODE_ENV !== "production" && process.env.ALLOW_PRIVATE_HOSTS === "true"

// Returns { safe: true, url } or { safe: false, reason }.
export const assertSafeUrl = async (rawUrl) => {
    let parsed
    try {
        parsed = new URL(rawUrl)
    } catch {
        return { safe: false, reason: "INVALID_URL" }
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
        return { safe: false, reason: "UNSUPPORTED_PROTOCOL" }
    }

    if (allowPrivateHosts()) {
        return { safe: true, url: parsed }
    }

    const hostname = parsed.hostname.toLowerCase()
    if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "0.0.0.0") {
        return { safe: false, reason: "PRIVATE_HOST" }
    }
    if (net.isIP(hostname) && isPrivateIp(hostname)) {
        return { safe: false, reason: "PRIVATE_HOST" }
    }

    try {
        const records = await dns.lookup(hostname, { all: true })
        if (records.some((r) => isPrivateIp(r.address))) {
            return { safe: false, reason: "PRIVATE_HOST" }
        }
    } catch {
        return { safe: false, reason: "DNS_LOOKUP_FAILED" }
    }

    return { safe: true, url: parsed }
}
