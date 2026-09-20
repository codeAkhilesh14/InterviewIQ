import { fetchPage } from "./fetchPage.js"
import { cleanHtml } from "./htmlClean.js"
import { scoreLink } from "./linkScoring.js"

const DEFAULT_MAX_PAGES = 6
const MAX_DEPTH = 2

// Best-first crawl of a company site: start at the homepage, score every outbound
// link (careers/hiring/handbook/about-style paths score highest - see linkScoring.js),
// and greedily fetch the highest-scoring unvisited link next. This is what lets the
// crawler find a hiring page nested a level under /careers, or published as
// /handbook, without any path being hard-coded.
//
// Returns { pages: [{url, title, text}], skipped: [{url, code, message}] }
export const crawlCompanySite = async (startUrl, { maxPages = DEFAULT_MAX_PAGES } = {}) => {
    const pages = []
    const skipped = []
    const visited = new Set()
    let originHost

    try {
        originHost = new URL(startUrl).host
    } catch {
        return { pages, skipped: [{ url: startUrl, code: "INVALID_URL", message: "Company URL is not a valid URL" }] }
    }

    const frontier = [{ url: startUrl, text: "", score: Infinity, depth: 0 }]

    while (frontier.length > 0 && pages.length < maxPages) {
        frontier.sort((a, b) => b.score - a.score)
        const next = frontier.shift()

        if (visited.has(next.url)) continue
        visited.add(next.url)

        let hostOk = false
        try {
            hostOk = new URL(next.url).host === originHost
        } catch {
            hostOk = false
        }
        if (!hostOk) continue

        const result = await fetchPage(next.url)
        if (!result.ok) {
            skipped.push({ url: next.url, code: result.code, message: result.message })
            continue
        }

        const { title, text, links } = cleanHtml(result.html, next.url)
        if (text.length < 40) {
            // Effectively empty page (e.g. a JS-only shell) - not useful, don't count
            // it against the page budget, but don't recurse into its (probably nav) links either.
            skipped.push({ url: next.url, code: "EMPTY_PAGE", message: "Page had no extractable text" })
            continue
        }

        pages.push({ url: result.finalUrl || next.url, title, text })

        if (next.depth < MAX_DEPTH) {
            for (const link of links) {
                if (visited.has(link.url)) continue
                let sameHost = false
                try {
                    sameHost = new URL(link.url).host === originHost
                } catch {
                    sameHost = false
                }
                if (!sameHost) continue
                frontier.push({ url: link.url, text: link.text, score: scoreLink(link), depth: next.depth + 1 })
            }
        }
    }

    return { pages, skipped }
}
