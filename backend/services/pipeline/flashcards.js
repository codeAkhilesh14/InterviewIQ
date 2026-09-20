import { callLLMJson } from "../llm/client.js"
import { SYSTEM_SAFETY_PREAMBLE, wrapUntrustedContent } from "../llm/promptSafety.js"

const SYSTEM_PROMPT = `${SYSTEM_SAFETY_PREAMBLE}

You write concise flashcards for interview prep - "front" is a short prompt/question/term, "back" is
a crisp, memorisable answer (a few sentences at most, not an essay). Each flashcard must set
"requirement_ids" to the requirement id(s) it helps the candidate remember.
Respond with ONLY a JSON object: { "flashcards": [ { "requirement_ids": string[], "front": string, "back": string } ] }`

// requirements: [{ id, text, priority, kind }]. Generates roughly one flashcard per
// requirement, more for "must" priority ones.
export const generateFlashcards = async (requirements, { companyName, roleTitle } = {}) => {
    if (!requirements || requirements.length === 0) return []

    const requirementList = requirements.map((r) => `- id: ${r.id} | priority: ${r.priority} | kind: ${r.kind} | requirement: ${r.text}`).join("\n")
    const user = `Role: ${roleTitle || "unspecified"} at ${companyName || "the company"}.
Generate 1 flashcard per requirement below (2 for "must" priority ones if the requirement is broad enough to warrant it).

${wrapUntrustedContent("the requirement list", requirementList, 4000)}`

    const parsed = await callLLMJson({ system: SYSTEM_PROMPT, user, maxTokens: 2400, temperature: 0.5 })
    const flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards : []
    const validIds = new Set(requirements.map((r) => r.id))

    return flashcards
        .filter((f) => f && typeof f.front === "string" && typeof f.back === "string" && f.front.trim() && f.back.trim())
        .map((f) => ({
            requirement_ids: Array.isArray(f.requirement_ids) ? f.requirement_ids.filter((id) => validIds.has(id)) : [],
            front: f.front.trim(),
            back: f.back.trim()
        }))
}
