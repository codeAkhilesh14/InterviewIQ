// Regeneration for a single section of an already-generated kit. The core rule
// (Section 6): "a question the user wrote or edited by hand must survive a
// regeneration of its category" - and, by the same logic, flashcards. An item
// survives when meta.origin === "user" (the user added it) OR meta.edited === true
// (the user changed a generated one) OR meta.pinned === true (explicitly protected).
// Everything else in that category/section is treated as disposable draft material
// and is replaced.
import { crawlCompanySite } from "../retrieval/crawler.js"
import { generateCompanyBrief } from "./companyBrief.js"
import { generateQuestionsForRequirements, generateSystemDesignQuestions } from "./generateQuestions.js"
import { generateFlashcards } from "./flashcards.js"
import { buildSchedule } from "./scheduler.js"
import { checkCoverage } from "./coverage.js"
import { nextIdFactoryFrom } from "../../utils/idFactory.js"

const isProtected = (meta) => meta?.origin === "user" || meta?.edited === true || meta?.pinned === true

const CATEGORY_TO_KIND = {
    technical: "technical",
    behavioural: "behavioural",
    "company-fit": "domain",
    "system-design": "technical"
}

export const regenerateCompanyBrief = async (kit) => {
    const crawl = await crawlCompanySite(kit.source.company_url)
    const brief = await generateCompanyBrief(kit.source.company, crawl.pages)
    kit.company_brief = { ...brief, sources: crawl.pages.map((p) => p.url), meta: { origin: "generated", edited: false, pinned: false } }
    return { skipped: crawl.skipped }
}

export const regenerateQuestionCategory = async (kit, category) => {
    const kind = CATEGORY_TO_KIND[category]
    if (!kind) throw new Error(`Unknown question category: ${category}`)

    const kept = kit.questions.filter((q) => q.category === category && isProtected(q.meta))
    const otherCategories = kit.questions.filter((q) => q.category !== category)
    const coveredByKept = new Set(kept.flatMap((q) => q.requirement_ids))

    const relevantRequirements = kit.role.requirements.filter((r) => r.kind === kind)
    const targetRequirements = relevantRequirements.filter((r) => !coveredByKept.has(r.id))

    const nextId = nextIdFactoryFrom(kit.questions.map((q) => q.id), "q")
    let fresh = []
    if (targetRequirements.length > 0) {
        fresh = category === "system-design"
            ? await generateSystemDesignQuestions(targetRequirements, { companyName: kit.source.company, roleTitle: kit.role.title })
            : await generateQuestionsForRequirements(targetRequirements, kind, { companyName: kit.source.company, roleTitle: kit.role.title })
    }
    const freshWithIds = fresh.map((q) => ({ ...q, id: nextId(), meta: { origin: "generated", edited: false, pinned: false } }))

    kit.questions = [...otherCategories, ...kept, ...freshWithIds]
    const coverage = checkCoverage(kit.role.requirements, kit.questions)
    kit.coverage = { uncovered_requirement_ids: coverage.uncovered_requirement_ids, passes: (kit.coverage?.passes || 0) + 1 }
    return { added: freshWithIds.length, kept: kept.length }
}

export const regenerateFlashcards = async (kit) => {
    const kept = kit.flashcards.filter((f) => isProtected(f.meta))
    const coveredByKept = new Set(kept.flatMap((f) => f.requirement_ids))
    const targetRequirements = kit.role.requirements.filter((r) => !coveredByKept.has(r.id))

    const nextId = nextIdFactoryFrom(kit.flashcards.map((f) => f.id), "f")
    const fresh = targetRequirements.length > 0
        ? await generateFlashcards(targetRequirements, { companyName: kit.source.company, roleTitle: kit.role.title })
        : []
    const freshWithIds = fresh.map((f) => ({ ...f, id: nextId(), meta: { origin: "generated", edited: false, pinned: false } }))

    kit.flashcards = [...kept, ...freshWithIds]
    return { added: freshWithIds.length, kept: kept.length }
}

// Free and instant - the schedule is pure arithmetic over the current question set,
// so "regenerating" it never needs the model at all.
export const regenerateSchedule = (kit) => {
    kit.schedule = { ...buildSchedule(kit.role.requirements, kit.questions, kit.schedule.days_available), meta: { origin: "generated", edited: false, pinned: false } }
}
