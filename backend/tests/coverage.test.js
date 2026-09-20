import { describe, it, expect } from "vitest"
import { checkCoverage, splitGapsByPriority } from "../services/pipeline/coverage.js"

const requirements = [
    { id: "r1", text: "React", kind: "technical", priority: "must" },
    { id: "r2", text: "Mentoring", kind: "behavioural", priority: "must" },
    { id: "r3", text: "GraphQL", kind: "technical", priority: "nice" }
]

describe("checkCoverage", () => {
    it("flags a requirement with no question referencing it", () => {
        const questions = [{ id: "q1", requirement_ids: ["r1"] }]
        const result = checkCoverage(requirements, questions)
        expect(result.uncovered_requirement_ids).toEqual(["r2", "r3"])
    })

    it("reports no gaps once every requirement has at least one question", () => {
        const questions = [
            { id: "q1", requirement_ids: ["r1"] },
            { id: "q2", requirement_ids: ["r2"] },
            { id: "q3", requirement_ids: ["r3"] }
        ]
        const result = checkCoverage(requirements, questions)
        expect(result.uncovered_requirement_ids).toEqual([])
    })

    it("counts a question covering multiple requirements toward all of them", () => {
        const questions = [{ id: "q1", requirement_ids: ["r1", "r2"] }]
        const result = checkCoverage(requirements, questions)
        expect(result.uncovered_requirement_ids).toEqual(["r3"])
    })

    it("treats zero questions as every requirement being a gap", () => {
        const result = checkCoverage(requirements, [])
        expect(result.uncovered_requirement_ids).toEqual(["r1", "r2", "r3"])
    })
})

describe("splitGapsByPriority", () => {
    it("separates must-have gaps from nice-to-have gaps", () => {
        const { mustGaps, niceGaps } = splitGapsByPriority(["r1", "r2", "r3"], requirements)
        expect(mustGaps.map((r) => r.id)).toEqual(["r1", "r2"])
        expect(niceGaps.map((r) => r.id)).toEqual(["r3"])
    })
})
