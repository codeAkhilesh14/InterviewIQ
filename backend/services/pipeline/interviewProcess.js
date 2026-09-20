import { callLLMJson } from "../llm/client.js"
import { SYSTEM_SAFETY_PREAMBLE, wrapUntrustedContent } from "../llm/promptSafety.js"

// Deterministic signal detection (cheap, no LLM call) - drives *what kind* of
// questions get generated. This is the concrete version of the brief's claim that
// "a company that publishes a take-home followed by a system design round should
// produce a different kit from one that says nothing": if we see "system design"
// mentioned in a hiring/discussion page, we generate system-design questions
// regardless of seniority; if nothing is found, signals are all false and the kit
// says so honestly instead of guessing.
const SIGNAL_PATTERNS = {
    systemDesign: /system[-\s]?design/i,
    takeHome: /take[-\s]?home|coding challenge|assignment/i,
    onsite: /on[-\s]?site|final round|panel interview/i,
    behavioural: /behavioural interview|behavioral interview|culture[-\s]?fit/i
}

const detectSignals = (text) => {
    const signals = {}
    for (const [key, re] of Object.entries(SIGNAL_PATTERNS)) {
        signals[key] = re.test(text)
    }
    return signals
}

const SYSTEM_PROMPT = `${SYSTEM_SAFETY_PREAMBLE}

Summarise ONLY what the provided pages actually say about this company's interview process
(stages, what's asked, formats, timelines). Do not guess or generalise from other companies.
If the pages contain no real information about the interview process, say so plainly.
Respond with ONLY a JSON object: { "notes": string }`

// hiringPages / discussionPages: [{ url, title, text }]
export const findInterviewProcessNotes = async (companyName, hiringPages, discussionPages) => {
    const sourcePages = [...(hiringPages || []), ...(discussionPages || [])]
    const combinedText = sourcePages.map((p) => p.text).join(" ")
    const signals = detectSignals(combinedText)

    if (sourcePages.length === 0) {
        return { notes: "No public information about this company's interview process was found.", signals, sources: [] }
    }

    const combined = sourcePages.map((p) => `# ${p.title || p.url}\nSource: ${p.url}\n${p.text}`).join("\n\n---\n\n")
    const user = `Company: ${companyName || "unknown"}.\n\n${wrapUntrustedContent("pages that may discuss the interview process", combined, 7000)}`

    try {
        const parsed = await callLLMJson({ system: SYSTEM_PROMPT, user, maxTokens: 500, temperature: 0.2 })
        const notes = typeof parsed.notes === "string" && parsed.notes.trim().length > 0
            ? parsed.notes.trim()
            : "No public information about this company's interview process was found."
        return { notes, signals, sources: sourcePages.map((p) => p.url) }
    } catch {
        // A failed summarisation call is not fatal - report honestly and keep the
        // deterministic keyword signals, which still let question generation adapt.
        return { notes: "Public discussion was found but could not be summarised due to a provider error.", signals, sources: sourcePages.map((p) => p.url) }
    }
}
