import * as cheerio from "cheerio"

const NOISE_SELECTORS = ["script", "style", "noscript", "svg", "nav", "footer", "iframe", "form"]
const MAX_TEXT_CHARS = 12000 // keep prompts bounded - this is cleaned page text, not raw HTML

// Strips boilerplate/noise from a raw HTML page and extracts:
// - title, readable text (bounded)
// - outgoing links with their anchor text, for the crawler's link-ranking step
export const cleanHtml = (html, baseUrl) => {
    const $ = cheerio.load(html)
    NOISE_SELECTORS.forEach((sel) => $(sel).remove())

    const title = $("title").first().text().trim() || $("h1").first().text().trim() || ""

    const text = $("body")
        .text()
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_TEXT_CHARS)

    const links = []
    const seen = new Set()
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href")
        const anchorText = $(el).text().replace(/\s+/g, " ").trim()
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
            return
        }
        let absolute
        try {
            absolute = new URL(href, baseUrl).toString()
        } catch {
            return
        }
        if (seen.has(absolute)) return
        seen.add(absolute)
        links.push({ url: absolute, text: anchorText })
    })

    return { title, text, links }
}
