// Keyword weights used to rank which links on a company site are worth fetching.
// Matched against both the URL path and the anchor text, case-insensitively.
// This is the "no fixed path list" requirement from the brief - GitLab publishes
// its hiring process under /handbook, PostHog under /handbook too, others under
// /careers or a "life at X" engineering blog post, so we rank by relevance signal
// instead of hard-coding a path.
const POSITIVE_SIGNALS = [
    { re: /\b(careers?|jobs?|hiring|join[-\s]?us|work[-\s]?with[-\s]?us|opportunities|openings|positions)\b/i, weight: 10 },
    { re: /\b(interview(ing)?[-\s]?process|how[-\s]?we[-\s]?hire|hiring[-\s]?process|our[-\s]?process|what[-\s]?to[-\s]?expect)\b/i, weight: 14 },
    { re: /\b(handbook)\b/i, weight: 9 },
    { re: /\b(life[-\s]?at|culture|team|people|values)\b/i, weight: 5 },
    { re: /\b(about([-\s]?us)?|company|mission|who[-\s]?we[-\s]?are)\b/i, weight: 6 },
    { re: /\b(engineering[-\s]?blog|blog)\b/i, weight: 3 },
    { re: /\b(benefits|perks)\b/i, weight: 3 }
]

const NEGATIVE_SIGNALS = [
    { re: /\b(privacy|terms|cookie|legal|login|sign[-\s]?in|sign[-\s]?up|register|cart|checkout|pricing|status)\b/i, weight: -8 }
]

export const scoreLink = ({ url, text }) => {
    let path
    try {
        path = new URL(url).pathname
    } catch {
        path = url
    }
    const haystack = `${path} ${text || ""}`

    let score = 0
    for (const { re, weight } of POSITIVE_SIGNALS) {
        if (re.test(haystack)) score += weight
    }
    for (const { re, weight } of NEGATIVE_SIGNALS) {
        if (re.test(haystack)) score += weight
    }

    // Mild preference for shallower, shorter paths (less likely to be deep noise).
    const depthPenalty = Math.max(0, path.split("/").filter(Boolean).length - 1) * 0.5
    return score - depthPenalty
}

export const isLikelyHiringPage = (url, text) => scoreLink({ url, text }) >= 9
