import { callLLMJson } from "../llm/client.js"
import { SYSTEM_SAFETY_PREAMBLE, wrapUntrustedContent } from "../llm/promptSafety.js"

const SYSTEM_PROMPT = `${SYSTEM_SAFETY_PREAMBLE}

You write a short, honest company brief for someone preparing for an interview there.
Rules:
- Base the brief ONLY on the provided page content. Never invent facts, funding details,
  headcount, or claims the pages do not support.
- If the provided pages contain little or no useful information, say so plainly in "summary"
  instead of padding it with generic filler (e.g. "Limited public information was found about
  this company from the pages retrieved.").
- Respond with ONLY a JSON object matching exactly: { "summary": string, "what_they_do": string }`

// pages: [{ url, title, text }] already crawled and cleaned.
export const generateCompanyBrief = async (companyName, pages) => {
    if (!pages || pages.length === 0) {
        return {
            summary: `No pages from ${companyName || "the company site"} could be retrieved, so this brief could not be generated from source material. Treat this kit's company context as unverified.`,
            what_they_do: ""
        }
    }

    const combined = pages
        .map((p) => `# ${p.title || p.url}\nSource: ${p.url}\n${p.text}`)
        .join("\n\n---\n\n")

    const user = `Company name (if known): ${companyName || "unknown"}\n\n${wrapUntrustedContent("content crawled from the company's website", combined, 9000)}`

    const parsed = await callLLMJson({ system: SYSTEM_PROMPT, user, maxTokens: 900, temperature: 0.3 })

    return {
        summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        what_they_do: typeof parsed.what_they_do === "string" ? parsed.what_they_do.trim() : ""
    }
}
