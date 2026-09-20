import { callLLMJson } from "../llm/client.js"
import { SYSTEM_SAFETY_PREAMBLE, wrapUntrustedContent } from "../llm/promptSafety.js"

// A requirement's "kind" decides which prompt/category it is generated with - a
// technical skill and "mentors junior engineers" must not come from the same call
// with the same instructions (brief, Section 3). Domain knowledge is framed as
// company-fit: does the candidate understand this company's specific domain.
const CATEGORY_PROMPTS = {
    technical: {
        category: "technical",
        instructions: `Write hands-on technical interview questions that verify real, practical
skill with the stated requirement (not trivia). Prefer questions that require the candidate to
reason, design, or explain trade-offs over ones with a single memorised answer.`
    },
    behavioural: {
        category: "behavioural",
        instructions: `Write behavioural interview questions (STAR-style) that probe the candidate's
real past experience with the stated requirement - collaboration, leadership, mentoring, conflict,
ownership, communication. Do not write technical/trivia questions here.`
    },
    domain: {
        category: "company-fit",
        instructions: `Write questions that probe the candidate's understanding of and fit for this
specific business domain/industry context, tying it back to what the company actually does.`
    }
}

const SYSTEM_PROMPT_BASE = `${SYSTEM_SAFETY_PREAMBLE}

You generate interview questions for a prep kit. For every requirement you are given, produce the
requested number of questions that specifically test that requirement - not generic questions.
Every question must set "requirement_ids" to the id(s) of the requirement(s) it actually covers.
difficulty is an integer 1 (easy) to 3 (hard) - use 3 for "must" priority requirements that need
deep expertise, lower for broad/nice-to-have ones.
Respond with ONLY a JSON object: { "questions": [ { "requirement_ids": string[], "prompt": string,
"answer_outline": string, "difficulty": number } ] }`

// requirements: [{ id, text, priority }] all of the SAME kind (technical | behavioural | domain).
// Returns raw question drafts (no id/category attached yet - the caller assigns those).
export const generateQuestionsForRequirements = async (requirements, kind, { companyName, roleTitle, questionsPerRequirement = 1 } = {}) => {
    if (!requirements || requirements.length === 0) return []

    const spec = CATEGORY_PROMPTS[kind] || CATEGORY_PROMPTS.technical
    const system = `${SYSTEM_PROMPT_BASE}\n\n${spec.instructions}`

    const requirementList = requirements.map((r) => `- id: ${r.id} | priority: ${r.priority} | requirement: ${r.text}`).join("\n")
    const user = `Role: ${roleTitle || "unspecified"} at ${companyName || "the company"}.
Generate exactly ${questionsPerRequirement} question(s) PER requirement below.

${wrapUntrustedContent("the requirement list (derived from the job description)", requirementList, 4000)}`

    const parsed = await callLLMJson({ system, user, maxTokens: 3200, temperature: 0.5 })
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    const validIds = new Set(requirements.map((r) => r.id))

    return questions
        .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim().length > 0)
        .map((q) => ({
            requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids.filter((id) => validIds.has(id)) : [],
            category: spec.category,
            prompt: q.prompt.trim(),
            answer_outline: typeof q.answer_outline === "string" ? q.answer_outline.trim() : "",
            difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2
        }))
        // A question that lost its requirement id (model drift) is not useful for coverage -
        // fall back to attaching it to the first requirement of this batch rather than dropping it.
        .map((q) => (q.requirement_ids.length > 0 ? q : { ...q, requirement_ids: [requirements[0].id] }))
}

const SYSTEM_DESIGN_PROMPT = `${SYSTEM_SAFETY_PREAMBLE}

You write system-design interview questions appropriate for a senior/staff-level candidate, built
around the specific technical requirements provided. Respond with ONLY a JSON object:
{ "questions": [ { "requirement_ids": string[], "prompt": string, "answer_outline": string, "difficulty": number } ] }`

// Adds a small number of system-design questions when the role looks senior and there is
// technical material to design around - this is additive, not a replacement for per-requirement coverage.
export const generateSystemDesignQuestions = async (technicalRequirements, { companyName, roleTitle, count = 2 } = {}) => {
    if (!technicalRequirements || technicalRequirements.length === 0) return []

    const requirementList = technicalRequirements.map((r) => `- id: ${r.id} | requirement: ${r.text}`).join("\n")
    const user = `Role: ${roleTitle || "unspecified"} (senior level) at ${companyName || "the company"}.
Generate ${count} system-design question(s) drawing on the requirements below.

${wrapUntrustedContent("the technical requirement list", requirementList, 3000)}`

    const parsed = await callLLMJson({ system: SYSTEM_DESIGN_PROMPT, user, maxTokens: 2000, temperature: 0.6 })
    const questions = Array.isArray(parsed.questions) ? parsed.questions : []
    const validIds = new Set(technicalRequirements.map((r) => r.id))

    return questions
        .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim().length > 0)
        .map((q) => ({
            requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids.filter((id) => validIds.has(id)) : [],
            category: "system-design",
            prompt: q.prompt.trim(),
            answer_outline: typeof q.answer_outline === "string" ? q.answer_outline.trim() : "",
            difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 3
        }))
}
