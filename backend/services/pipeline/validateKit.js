import { z } from "zod"

// Mirrors Appendix A exactly (field names, enums, integer minutes). Used to validate
// a kit before it is saved/returned from the API, and again before it is written to
// the batch output file (Section 13: "validate a generated kit against the expected
// structure before saving it").
const requirementSchema = z.object({
    id: z.string().min(1),
    text: z.string().min(1),
    kind: z.enum(["technical", "behavioural", "domain"]),
    priority: z.enum(["must", "nice"])
})

const questionSchema = z.object({
    id: z.string().min(1),
    requirement_ids: z.array(z.string()),
    category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
    prompt: z.string().min(1),
    answer_outline: z.string(),
    difficulty: z.number().int().min(1).max(3)
})

const flashcardSchema = z.object({
    id: z.string().min(1),
    front: z.string().min(1),
    back: z.string().min(1),
    requirement_ids: z.array(z.string())
})

const scheduleDaySchema = z.object({
    day: z.number().int().min(1),
    focus: z.string(),
    question_ids: z.array(z.string()),
    minutes: z.number().int().min(0)
})

export const kitSchema = z.object({
    source: z.object({
        company: z.string(),
        company_url: z.string(),
        role: z.string(),
        location: z.string(),
        jd_chars: z.number().int().min(0),
        researched_at: z.string(),
        pages_used: z.array(z.string())
    }),
    company_brief: z.object({
        summary: z.string(),
        what_they_do: z.string(),
        sources: z.array(z.string())
    }),
    // Extension field (see kit.model.js comment) - surfaces the "public discussion of
    // interview process" research step called out in Section 3 as its own output.
    interview_process: z.object({
        notes: z.string(),
        signals: z.object({
            systemDesign: z.boolean(),
            takeHome: z.boolean(),
            onsite: z.boolean(),
            behavioural: z.boolean()
        }),
        sources: z.array(z.string())
    }),
    role: z.object({
        title: z.string(),
        seniority: z.string(),
        responsibilities: z.array(z.string()),
        requirements: z.array(requirementSchema)
    }),
    questions: z.array(questionSchema),
    flashcards: z.array(flashcardSchema),
    schedule: z.object({
        days_available: z.number().int().min(1),
        days: z.array(scheduleDaySchema)
    }),
    coverage: z.object({
        uncovered_requirement_ids: z.array(z.string()),
        passes: z.number().int().min(0)
    })
})

// Beyond shape, the brief calls out referential integrity explicitly: "every
// question_ids entry in the schedule must refer to a question that exists", and by
// the same logic every question's/flashcard's requirement_ids must refer to a real
// requirement id, and every id must be unique within its section.
const checkReferentialIntegrity = (kit) => {
    const errors = []
    const requirementIds = new Set(kit.role.requirements.map((r) => r.id))
    const questionIds = new Set(kit.questions.map((q) => q.id))

    const duplicates = (ids, label) => {
        const seen = new Set()
        for (const id of ids) {
            if (seen.has(id)) errors.push(`Duplicate ${label} id: ${id}`)
            seen.add(id)
        }
    }
    duplicates(kit.role.requirements.map((r) => r.id), "requirement")
    duplicates(kit.questions.map((q) => q.id), "question")
    duplicates(kit.flashcards.map((f) => f.id), "flashcard")

    kit.questions.forEach((q) => {
        q.requirement_ids.forEach((id) => {
            if (!requirementIds.has(id)) errors.push(`Question ${q.id} references unknown requirement ${id}`)
        })
    })
    kit.flashcards.forEach((f) => {
        f.requirement_ids.forEach((id) => {
            if (!requirementIds.has(id)) errors.push(`Flashcard ${f.id} references unknown requirement ${id}`)
        })
    })
    kit.schedule.days.forEach((day) => {
        day.question_ids.forEach((id) => {
            if (!questionIds.has(id)) errors.push(`Schedule day ${day.day} references unknown question ${id}`)
        })
    })
    if (kit.schedule.days.length !== kit.schedule.days_available) {
        errors.push(`schedule.days has ${kit.schedule.days.length} entries but days_available is ${kit.schedule.days_available}`)
    }
    kit.coverage.uncovered_requirement_ids.forEach((id) => {
        if (!requirementIds.has(id)) errors.push(`coverage references unknown requirement ${id}`)
    })

    return errors
}

// Returns { valid: true, kit } or { valid: false, errors: string[] }.
export const validateKit = (candidate) => {
    const result = kitSchema.safeParse(candidate)
    if (!result.success) {
        return { valid: false, errors: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }
    }
    const referentialErrors = checkReferentialIntegrity(result.data)
    if (referentialErrors.length > 0) {
        return { valid: false, errors: referentialErrors }
    }
    return { valid: true, kit: result.data }
}
