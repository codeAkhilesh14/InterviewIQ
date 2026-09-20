import * as cheerio from "cheerio"
import { fetchPage } from "./fetchPage.js"
import { cleanHtml } from "./htmlClean.js"

const SEARCH_ENDPOINT = "https://lite.duckduckgo.com/lite/"
const MAX_RESULT_PAGES = 3

// DuckDuckGo's "lite" HTML endpoint requires no API key, which matters here: the
// brief explicitly rules out paid services. It returns a plain server-rendered
// results page we can parse with cheerio - no JS execution needed.
const searchDuckDuckGo = async (query) => {
    const url = `${SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}`
    const result = await fetchPage(url, { respectRobots: false })
    if (!result.ok) return { ok: false, code: result.code, message: result.message }

    const $ = cheerio.load(result.html)
    const results = []
    $("a.result-link, a[href^='http']").each((_, el) => {
        const href = $(el).attr("href")
        const text = $(el).text().trim()
        if (href && href.startsWith("http") && !href.includes("duckduckgo.com") && text) {
            results.push({ url: href, title: text })
        }
    })
    return { ok: true, results: results.slice(0, 8) }
}

// Looks for public discussion of a company's interview process (Glassdoor threads,
// blog posts, forum posts, etc). Best-effort: search engines change their markup
// often and this is not the company's own site, so a failure here is recorded and
// skipped rather than failing the whole pipeline (Section 2 / Section 10).
export const findPublicDiscussion = async (companyName) => {
    if (!companyName || companyName.trim().length === 0) {
        return { pages: [], skipped: [{ url: null, code: "NO_COMPANY_NAME", message: "No company name available to search with" }] }
    }

    const query = `${companyName} interview process questions`
    const search = await searchDuckDuckGo(query)
    if (!search.ok) {
        return { pages: [], skipped: [{ url: SEARCH_ENDPOINT, code: search.code, message: `Public discussion search failed: ${search.message}` }] }
    }
    if (search.results.length === 0) {
        return { pages: [], skipped: [{ url: SEARCH_ENDPOINT, code: "NO_RESULTS", message: `No public discussion found for "${companyName}"` }] }
    }

    const pages = []
    const skipped = []
    for (const item of search.results) {
        if (pages.length >= MAX_RESULT_PAGES) break
        const fetched = await fetchPage(item.url)
        if (!fetched.ok) {
            skipped.push({ url: item.url, code: fetched.code, message: fetched.message })
            continue
        }
        const { title, text } = cleanHtml(fetched.html, item.url)
        if (text.length < 80) continue
        pages.push({ url: fetched.finalUrl || item.url, title: title || item.title, text })
    }

    return { pages, skipped }
}
