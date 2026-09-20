import { describe, it, expect } from "vitest"
import { buildSchedule } from "../services/pipeline/scheduler.js"

const requirements = [
    { id: "r1", text: "5+ years React", kind: "technical", priority: "must" },
    { id: "r2", text: "Mentors junior engineers", kind: "behavioural", priority: "must" },
    { id: "r3", text: "Nice to have: GraphQL", kind: "technical", priority: "nice" }
]

const questions = [
    { id: "q1", requirement_ids: ["r1"], category: "technical", difficulty: 3 },
    { id: "q2", requirement_ids: ["r2"], category: "behavioural", difficulty: 2 },
    { id: "q3", requirement_ids: ["r3"], category: "technical", difficulty: 1 },
    { id: "q4", requirement_ids: ["r1"], category: "technical", difficulty: 2 }
]

describe("buildSchedule", () => {
    it("produces exactly the number of days requested", () => {
        const schedule = buildSchedule(requirements, questions, 5)
        expect(schedule.days_available).toBe(5)
        expect(schedule.days).toHaveLength(5)
        schedule.days.forEach((day, index) => expect(day.day).toBe(index + 1))
    })

    it("allocates every generated question somewhere in the schedule", () => {
        const schedule = buildSchedule(requirements, questions, 2)
        const scheduledIds = schedule.days.flatMap((d) => d.question_ids)
        for (const q of questions) {
            expect(scheduledIds).toContain(q.id)
        }
    })

    it("puts every must-have requirement's question somewhere in the schedule", () => {
        const schedule = buildSchedule(requirements, questions, 3)
        const scheduledIds = new Set(schedule.days.flatMap((d) => d.question_ids))
        const mustRequirementIds = requirements.filter((r) => r.priority === "must").map((r) => r.id)
        const scheduledQuestions = questions.filter((q) => scheduledIds.has(q.id))
        for (const reqId of mustRequirementIds) {
            const covered = scheduledQuestions.some((q) => q.requirement_ids.includes(reqId))
            expect(covered).toBe(true)
        }
    })

    it("front-loads higher priority and harder material into earlier days", () => {
        const schedule = buildSchedule(requirements, questions, 4)
        // q1 (must, difficulty 3) should land on day 1, before q3 (nice, difficulty 1)
        const dayOf = (qid) => schedule.days.find((d) => d.question_ids.includes(qid))?.day
        expect(dayOf("q1")).toBeLessThanOrEqual(dayOf("q3"))
    })

    it("keeps minutes as integers", () => {
        const schedule = buildSchedule(requirements, questions, 3)
        schedule.days.forEach((day) => {
            expect(Number.isInteger(day.minutes)).toBe(true)
        })
    })

    it("handles a 1-day schedule by cramming everything into day 1", () => {
        const schedule = buildSchedule(requirements, questions, 1)
        expect(schedule.days).toHaveLength(1)
        expect(schedule.days[0].question_ids.sort()).toEqual(questions.map((q) => q.id).sort())
    })

    it("handles a schedule with more days than questions by adding review days", () => {
        const schedule = buildSchedule(requirements, questions, 10)
        expect(schedule.days).toHaveLength(10)
        // every day still has content, none are empty
        schedule.days.forEach((day) => expect(day.question_ids.length).toBeGreaterThan(0))
    })

    it("handles zero questions honestly (thin job description) without crashing", () => {
        const schedule = buildSchedule(requirements, [], 5)
        expect(schedule.days).toHaveLength(5)
        schedule.days.forEach((day) => {
            expect(day.question_ids).toEqual([])
            expect(day.minutes).toBe(0)
        })
    })
})
