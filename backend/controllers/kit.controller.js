import Kit from "../models/kit.model.js"
import { runPipeline, PipelineError } from "../services/pipeline/runPipeline.js"
import { regenerateCompanyBrief, regenerateQuestionCategory, regenerateFlashcards, regenerateSchedule } from "../services/pipeline/regenerate.js"
import { nextIdFactoryFrom } from "../utils/idFactory.js"

const KIT_LIST_FIELDS = "status source.company source.role input.days_requested input.company_url createdAt updatedAt error"

// Runs the pipeline in the background and streams progress onto the Kit document
// as it goes, so the frontend can poll GET /api/kit/:id and show live steps
// instead of a single opaque spinner (Section 12: "clear loading ... states").
const startGeneration = async (kitId) => {
    const kit = await Kit.findById(kitId)
    if (!kit) return

    kit.status = "generating"
    kit.progress = []
    await kit.save()

    // Pipeline steps can report progress in overlapping bursts (e.g. the parallel
    // technical/behavioural/domain question calls), and Mongoose refuses to run
    // save() twice at once on the same document - so progress writes are chained
    // through a single-file queue instead of firing concurrently.
    let saveQueue = Promise.resolve()
    const persistProgress = (event) => {
        kit.progress.push(event)
        saveQueue = saveQueue.then(() => kit.save()).catch(() => {})
        return saveQueue
    }

    try {
        const { kit: generated, warnings } = await runPipeline(
            { jd: kit.input.jd, companyUrl: kit.input.company_url, days: kit.input.days_requested },
            { onProgress: persistProgress }
        )
        await saveQueue

        kit.source = generated.source
        kit.company_brief = { ...generated.company_brief, meta: { origin: "generated", edited: false, pinned: false } }
        kit.interview_process = generated.interview_process
        kit.role = generated.role
        kit.questions = generated.questions.map((q) => ({ ...q, meta: { origin: "generated", edited: false, pinned: false } }))
        kit.flashcards = generated.flashcards.map((f) => ({ ...f, meta: { origin: "generated", edited: false, pinned: false } }))
        kit.schedule = { ...generated.schedule, meta: { origin: "generated", edited: false, pinned: false } }
        kit.coverage = generated.coverage
        kit.status = "ready"
        kit.error = undefined
        if (warnings?.length) {
            kit.progress.push({ step: "warnings", status: "done", message: `${warnings.length} source(s) skipped: ${warnings.slice(0, 5).map((w) => w.code).join(", ")}`, at: new Date() })
        }
        await kit.save()
    } catch (error) {
        await saveQueue
        kit.status = "failed"
        kit.error = {
            code: error instanceof PipelineError ? error.code : "UNKNOWN_ERROR",
            message: error.message
        }
        await kit.save().catch(() => {})
    }
}

export const createKit = async (req, res) => {
    try {
        const { jd, company_url, days } = req.body

        if (!jd || typeof jd !== "string" || jd.trim().length === 0) {
            return res.status(400).json({ message: "Job description is required" })
        }
        if (!company_url || typeof company_url !== "string" || company_url.trim().length === 0) {
            return res.status(400).json({ message: "Company website URL is required" })
        }
        const daysRequested = Number(days)
        if (!Number.isFinite(daysRequested) || daysRequested < 1) {
            return res.status(400).json({ message: "Days must be a positive number" })
        }

        // Same description + company submitted twice (Section 10) - hand back the
        // existing kit instead of burning another rate-limited generation run on it.
        const existing = await Kit.findOne({
            owner: req.user._id,
            "input.jd": jd.trim(),
            "input.company_url": company_url.trim()
        })
        if (existing && existing.status !== "failed") {
            return res.status(200).json({ ...existing.toObject(), duplicate: true })
        }

        const kit = existing
            ? Object.assign(existing, { input: { jd: jd.trim(), company_url: company_url.trim(), days_requested: Math.round(daysRequested) }, status: "pending", error: undefined })
            : new Kit({
                owner: req.user._id,
                input: { jd: jd.trim(), company_url: company_url.trim(), days_requested: Math.round(daysRequested) },
                status: "pending"
            })
        await kit.save()

        startGeneration(kit._id).catch(() => {})

        return res.status(201).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `CreateKit error: ${error.message}` })
    }
}

// Batch entry point for the "more than one role at once" requirement (Section 2) -
// the frontend parses the uploaded file client-side into { jd, company_url, days }[]
// and posts it here; each item becomes its own kit and generates independently.
export const createKitsBatch = async (req, res) => {
    try {
        const { items } = req.body
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: "items must be a non-empty array of { jd, company_url, days }" })
        }
        if (items.length > 20) {
            return res.status(400).json({ message: "A single batch upload is limited to 20 entries" })
        }

        const created = []
        for (const item of items) {
            if (!item?.jd || !item?.company_url) {
                created.push({ status: "failed", error: { code: "INVALID_CASE", message: "Missing jd or company_url" } })
                continue
            }
            const kit = new Kit({
                owner: req.user._id,
                input: { jd: String(item.jd).trim(), company_url: String(item.company_url).trim(), days_requested: Math.max(1, Math.round(Number(item.days) || 5)) },
                status: "pending"
            })
            await kit.save()
            startGeneration(kit._id).catch(() => {})
            created.push(kit)
        }

        return res.status(201).json({ kits: created })
    } catch (error) {
        return res.status(500).json({ message: `CreateKitsBatch error: ${error.message}` })
    }
}

export const listKits = async (req, res) => {
    try {
        const kits = await Kit.find({ owner: req.user._id }).select(KIT_LIST_FIELDS).sort("-createdAt")
        return res.status(200).json(kits)
    } catch (error) {
        return res.status(500).json({ message: `ListKits error: ${error.message}` })
    }
}

const findOwnedKit = async (req) => Kit.findOne({ _id: req.params.id, owner: req.user._id })

export const getKit = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!kit) return res.status(404).json({ message: "Kit not found" })
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `GetKit error: ${error.message}` })
    }
}

export const deleteKit = async (req, res) => {
    try {
        const kit = await Kit.findOneAndDelete({ _id: req.params.id, owner: req.user._id })
        if (!kit) return res.status(404).json({ message: "Kit not found" })
        return res.status(200).json({ message: "Kit deleted" })
    } catch (error) {
        return res.status(500).json({ message: `DeleteKit error: ${error.message}` })
    }
}

const guardEditable = (kit, res) => {
    if (!kit) {
        res.status(404).json({ message: "Kit not found" })
        return false
    }
    if (kit.status === "generating") {
        res.status(409).json({ message: "This kit is still generating, try again shortly" })
        return false
    }
    return true
}

export const updateCompanyBrief = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const { summary, what_they_do } = req.body
        if (typeof summary === "string") kit.company_brief.summary = summary
        if (typeof what_they_do === "string") kit.company_brief.what_they_do = what_they_do
        kit.company_brief.meta.edited = true
        kit.markModified("company_brief")
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `UpdateCompanyBrief error: ${error.message}` })
    }
}

// --- Questions -------------------------------------------------------------

export const addQuestion = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const { category, prompt, answer_outline, difficulty, requirement_ids } = req.body
        if (!category || !prompt) return res.status(400).json({ message: "category and prompt are required" })

        const nextId = nextIdFactoryFrom(kit.questions.map((q) => q.id), "q")
        kit.questions.push({
            id: nextId(),
            requirement_ids: Array.isArray(requirement_ids) ? requirement_ids : [],
            category,
            prompt,
            answer_outline: answer_outline || "",
            difficulty: [1, 2, 3].includes(difficulty) ? difficulty : 2,
            meta: { origin: "user", edited: false, pinned: true }
        })
        await kit.save()
        return res.status(201).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `AddQuestion error: ${error.message}` })
    }
}

export const updateQuestion = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const question = kit.questions.find((q) => q.id === req.params.qid)
        if (!question) return res.status(404).json({ message: "Question not found" })

        const { prompt, answer_outline, difficulty, requirement_ids, category } = req.body
        if (typeof prompt === "string") question.prompt = prompt
        if (typeof answer_outline === "string") question.answer_outline = answer_outline
        if ([1, 2, 3].includes(difficulty)) question.difficulty = difficulty
        if (Array.isArray(requirement_ids)) question.requirement_ids = requirement_ids
        if (typeof category === "string") question.category = category
        if (question.meta?.origin !== "user") question.meta.edited = true

        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `UpdateQuestion error: ${error.message}` })
    }
}

export const deleteQuestion = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        kit.questions = kit.questions.filter((q) => q.id !== req.params.qid)
        kit.schedule.days.forEach((day) => {
            day.question_ids = day.question_ids.filter((id) => id !== req.params.qid)
        })
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `DeleteQuestion error: ${error.message}` })
    }
}

export const toggleQuestionPin = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const question = kit.questions.find((q) => q.id === req.params.qid)
        if (!question) return res.status(404).json({ message: "Question not found" })
        question.meta.pinned = !question.meta.pinned
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `ToggleQuestionPin error: ${error.message}` })
    }
}

// Reorders questions within a category, and/or moves a question to a different
// category, in one call - both are just "change position/category in the array".
export const reorderQuestions = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const { orderedIds } = req.body
        if (!Array.isArray(orderedIds)) return res.status(400).json({ message: "orderedIds must be an array of question ids" })

        const byId = new Map(kit.questions.map((q) => [q.id, q]))
        const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
        const remaining = kit.questions.filter((q) => !orderedIds.includes(q.id))
        // Reordered items keep their relative position; anything not mentioned stays after, unchanged.
        kit.questions = [...reordered, ...remaining]
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `ReorderQuestions error: ${error.message}` })
    }
}

// --- Flashcards --------------------------------------------------------------

export const addFlashcard = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const { front, back, requirement_ids } = req.body
        if (!front || !back) return res.status(400).json({ message: "front and back are required" })

        const nextId = nextIdFactoryFrom(kit.flashcards.map((f) => f.id), "f")
        kit.flashcards.push({
            id: nextId(),
            front,
            back,
            requirement_ids: Array.isArray(requirement_ids) ? requirement_ids : [],
            meta: { origin: "user", edited: false, pinned: true }
        })
        await kit.save()
        return res.status(201).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `AddFlashcard error: ${error.message}` })
    }
}

export const updateFlashcard = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const flashcard = kit.flashcards.find((f) => f.id === req.params.fid)
        if (!flashcard) return res.status(404).json({ message: "Flashcard not found" })

        const { front, back, requirement_ids } = req.body
        if (typeof front === "string") flashcard.front = front
        if (typeof back === "string") flashcard.back = back
        if (Array.isArray(requirement_ids)) flashcard.requirement_ids = requirement_ids
        if (flashcard.meta?.origin !== "user") flashcard.meta.edited = true

        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `UpdateFlashcard error: ${error.message}` })
    }
}

export const deleteFlashcard = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        kit.flashcards = kit.flashcards.filter((f) => f.id !== req.params.fid)
        kit.practiceLog = kit.practiceLog.filter((p) => p.flashcard_id !== req.params.fid)
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `DeleteFlashcard error: ${error.message}` })
    }
}

// --- Regeneration ------------------------------------------------------------

export const regenerateSection = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!guardEditable(kit, res)) return

        const { section, category } = req.body
        kit.status = "generating"
        await kit.save()

        try {
            if (section === "company_brief") {
                await regenerateCompanyBrief(kit)
            } else if (section === "questions") {
                if (!category) throw new Error("category is required to regenerate a question section")
                await regenerateQuestionCategory(kit, category)
            } else if (section === "flashcards") {
                await regenerateFlashcards(kit)
            } else if (section === "schedule") {
                regenerateSchedule(kit)
            } else {
                kit.status = "ready"
                await kit.save()
                return res.status(400).json({ message: `Unknown section: ${section}` })
            }
            kit.status = "ready"
            await kit.save()
            return res.status(200).json(kit)
        } catch (innerError) {
            kit.status = "ready" // regeneration failing shouldn't strand the kit in "generating"
            await kit.save().catch(() => {})
            return res.status(502).json({ message: `Regeneration failed: ${innerError.message}` })
        }
    } catch (error) {
        return res.status(500).json({ message: `RegenerateSection error: ${error.message}` })
    }
}

// --- Practice mode -------------------------------------------------------------

export const logPractice = async (req, res) => {
    try {
        const kit = await findOwnedKit(req)
        if (!kit) return res.status(404).json({ message: "Kit not found" })

        const { flashcard_id, confidence } = req.body
        if (!flashcard_id || ![1, 2, 3].includes(confidence)) {
            return res.status(400).json({ message: "flashcard_id and confidence (1-3) are required" })
        }
        kit.practiceLog.push({ flashcard_id, confidence, practiced_at: new Date() })
        await kit.save()
        return res.status(200).json(kit)
    } catch (error) {
        return res.status(500).json({ message: `LogPractice error: ${error.message}` })
    }
}
