import mongoose from "mongoose"

// Every generated/edited item carries a small meta block so a regeneration of one
// section (e.g. "technical" questions) can tell which items were produced by the
// model, which were hand-edited by the user, and which were pinned - and skip
// overwriting the last two. See README "State model" section for the reasoning.
const itemMetaSchema = new mongoose.Schema({
    origin: { type: String, enum: ["generated", "user"], default: "generated" },
    edited: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false }
}, { _id: false })

const requirementSchema = new mongoose.Schema({
    id: { type: String, required: true },
    text: { type: String, required: true },
    kind: { type: String, enum: ["technical", "behavioural", "domain"], required: true },
    priority: { type: String, enum: ["must", "nice"], required: true }
}, { _id: false })

const questionSchema = new mongoose.Schema({
    id: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    category: { type: String, enum: ["technical", "behavioural", "system-design", "company-fit"], required: true },
    prompt: { type: String, required: true },
    answer_outline: { type: String, default: "" },
    difficulty: { type: Number, min: 1, max: 3, default: 2 },
    meta: { type: itemMetaSchema, default: () => ({}) }
}, { _id: false })

const flashcardSchema = new mongoose.Schema({
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    requirement_ids: { type: [String], default: [] },
    meta: { type: itemMetaSchema, default: () => ({}) }
}, { _id: false })

const scheduleDaySchema = new mongoose.Schema({
    day: { type: Number, required: true },
    focus: { type: String, default: "" },
    question_ids: { type: [String], default: [] },
    minutes: { type: Number, required: true }
}, { _id: false })

// Practice mode: one entry per (flashcard, attempt). Confidence 1 (low) - 3 (high).
const practiceLogSchema = new mongoose.Schema({
    flashcard_id: { type: String, required: true },
    confidence: { type: Number, min: 1, max: 3, required: true },
    practiced_at: { type: Date, default: Date.now }
}, { _id: false })

const progressStepSchema = new mongoose.Schema({
    step: { type: String, required: true },
    status: { type: String, enum: ["pending", "running", "done", "skipped", "failed"], default: "pending" },
    message: { type: String, default: "" },
    at: { type: Date, default: Date.now }
}, { _id: false })

const kitSchema = new mongoose.Schema({
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },

    // Raw user input, kept so a kit can be regenerated/re-run later.
    input: {
        jd: { type: String, required: true },
        company_url: { type: String, required: true },
        days_requested: { type: Number, required: true }
    },

    // Generation lifecycle - drives the frontend's progress UI.
    status: { type: String, enum: ["pending", "generating", "ready", "failed"], default: "pending", index: true },
    progress: { type: [progressStepSchema], default: [] },
    error: { code: String, message: String },

    // Appendix A structure - field names below must match the brief exactly.
    source: {
        company: { type: String, default: "" },
        company_url: { type: String, default: "" },
        role: { type: String, default: "" },
        location: { type: String, default: "" },
        jd_chars: { type: Number, default: 0 },
        researched_at: { type: String, default: "" },
        pages_used: { type: [String], default: [] }
    },
    company_brief: {
        summary: { type: String, default: "" },
        what_they_do: { type: String, default: "" },
        sources: { type: [String], default: [] },
        meta: { type: itemMetaSchema, default: () => ({}) }
    },
    // Extension beyond Appendix A (brief explicitly allows extending "where that
    // genuinely helps"): the brief calls out looking for public discussion of the
    // interview process as its own pipeline step, distinct from the company brief -
    // this is where its output is surfaced, and it is what lets question generation
    // adapt to a company that publishes e.g. a take-home + system-design process.
    interview_process: {
        notes: { type: String, default: "" },
        signals: {
            systemDesign: { type: Boolean, default: false },
            takeHome: { type: Boolean, default: false },
            onsite: { type: Boolean, default: false },
            behavioural: { type: Boolean, default: false }
        },
        sources: { type: [String], default: [] }
    },
    role: {
        title: { type: String, default: "" },
        seniority: { type: String, default: "" },
        responsibilities: { type: [String], default: [] },
        requirements: { type: [requirementSchema], default: [] }
    },
    questions: { type: [questionSchema], default: [] },
    flashcards: { type: [flashcardSchema], default: [] },
    schedule: {
        days_available: { type: Number, default: 0 },
        days: { type: [scheduleDaySchema], default: [] },
        meta: { type: itemMetaSchema, default: () => ({}) }
    },
    coverage: {
        uncovered_requirement_ids: { type: [String], default: [] },
        passes: { type: Number, default: 0 }
    },

    practiceLog: { type: [practiceLogSchema], default: [] }
}, { timestamps: true })

kitSchema.index({ owner: 1, "input.jd": 1, "input.company_url": 1 })

const Kit = mongoose.model("Kit", kitSchema)

export default Kit
