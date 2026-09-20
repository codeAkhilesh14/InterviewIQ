import { describe, it, expect } from "vitest"
import { validateKit } from "../services/pipeline/validateKit.js"

const makeValidKit = () => ({
    source: {
        company: "Acme", company_url: "https://acme.example.com", role: "Backend Engineer",
        location: "Remote", jd_chars: 500, researched_at: new Date().toISOString(), pages_used: ["https://acme.example.com"]
    },
    company_brief: { summary: "A software company.", what_they_do: "Builds widgets.", sources: ["https://acme.example.com"] },
    interview_process: { notes: "No information found.", signals: { systemDesign: false, takeHome: false, onsite: false, behavioural: false }, sources: [] },
    role: {
        title: "Backend Engineer", seniority: "Senior", responsibilities: ["Build APIs"],
        requirements: [{ id: "r1", text: "5+ years with React", kind: "technical", priority: "must" }]
    },
    questions: [{ id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "Explain reconciliation", answer_outline: "...", difficulty: 2 }],
    flashcards: [{ id: "f1", front: "What is reconciliation?", back: "The diffing algorithm...", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "Technical", question_ids: ["q1"], minutes: 25 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 }
})

describe("validateKit", () => {
    it("accepts a well-formed kit", () => {
        const result = validateKit(makeValidKit())
        expect(result.valid).toBe(true)
    })

    it("rejects a question referencing a requirement id that does not exist", () => {
        const kit = makeValidKit()
        kit.questions[0].requirement_ids = ["r99"]
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
        expect(result.errors.some((e) => e.includes("unknown requirement"))).toBe(true)
    })

    it("rejects a schedule question_ids entry referencing a question that does not exist", () => {
        const kit = makeValidKit()
        kit.schedule.days[0].question_ids = ["q99"]
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
        expect(result.errors.some((e) => e.includes("unknown question"))).toBe(true)
    })

    it("rejects non-integer minutes", () => {
        const kit = makeValidKit()
        kit.schedule.days[0].minutes = 25.5
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
    })

    it("rejects a mismatched schedule day count vs days_available", () => {
        const kit = makeValidKit()
        kit.schedule.days_available = 3
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
        expect(result.errors.some((e) => e.includes("days_available"))).toBe(true)
    })

    it("rejects duplicate requirement ids", () => {
        const kit = makeValidKit()
        kit.role.requirements.push({ id: "r1", text: "Duplicate", kind: "technical", priority: "nice" })
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
        expect(result.errors.some((e) => e.includes("Duplicate requirement"))).toBe(true)
    })

    it("rejects an invalid priority value", () => {
        const kit = makeValidKit()
        kit.role.requirements[0].priority = "optional"
        const result = validateKit(kit)
        expect(result.valid).toBe(false)
    })
})
