import { callLLMJson } from "../llm/client.js"
import { SYSTEM_SAFETY_PREAMBLE, wrapUntrustedContent } from "../llm/promptSafety.js"
import { makeIdFactory } from "../../utils/idFactory.js"

const SYSTEM_PROMPT = `${SYSTEM_SAFETY_PREAMBLE}

You extract structured information from a job description for an interview-prep tool.
Rules:
- Only extract requirements that are actually stated or clearly implied in the text. Never invent
  a requirement the posting does not contain. If the posting is thin, return few requirements -
  that is the correct output for a thin posting, not a failure.
- priority "must" is for requirements phrased as required/needed/you have/X+ years - "nice" is for
  anything phrased as a bonus, preferred, plus, or "nice to have". Do not default everything to must.
- kind "technical" is for hard/tool/language/framework skills, "domain" is for industry/product
  knowledge, "behavioural" is for soft skills, leadership, mentoring, communication, collaboration.
- Respond with ONLY a JSON object, no prose, matching exactly:
{
  "title": string, "seniority": string, "location": string,
  "responsibilities": string[],
  "requirements": [ { "text": string, "kind": "technical"|"behavioural"|"domain", "priority": "must"|"nice" } ]
}
If a field cannot be determined, use an empty string (or empty array). Do not fabricate a title,
seniority or location that is not implied by the text.`

// Deterministic post-processing step: the model returns requirement text/kind/priority,
// but stable ids ("r1", "r2", ...) are assigned here in code, not by the model - this
// keeps ids stable and predictable regardless of what the model happens to output.
export const extractRequirements = async (jd) => {
    const user = wrapUntrustedContent("the job description", jd, 6000)

    const parsed = await callLLMJson({ system: SYSTEM_PROMPT, user, maxTokens: 1800, temperature: 0.2 })

    const nextId = makeIdFactory("r")
    const requirements = Array.isArray(parsed.requirements)
        ? parsed.requirements
            .filter((r) => r && typeof r.text === "string" && r.text.trim().length > 0)
            .map((r) => ({
                id: nextId(),
                text: r.text.trim(),
                kind: ["technical", "behavioural", "domain"].includes(r.kind) ? r.kind : "technical",
                priority: r.priority === "nice" ? "nice" : "must"
            }))
        : []

    return {
        title: typeof parsed.title === "string" ? parsed.title.trim() : "",
        seniority: typeof parsed.seniority === "string" ? parsed.seniority.trim() : "",
        location: typeof parsed.location === "string" ? parsed.location.trim() : "",
        responsibilities: Array.isArray(parsed.responsibilities)
            ? parsed.responsibilities.filter((r) => typeof r === "string" && r.trim().length > 0).map((r) => r.trim())
            : [],
        requirements
    }
}
