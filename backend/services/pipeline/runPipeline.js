import { extractRequirements } from "./extractRequirements.js"
import { crawlCompanySite } from "../retrieval/crawler.js"
import { findPublicDiscussion } from "../retrieval/publicDiscussion.js"
import { isLikelyHiringPage } from "../retrieval/linkScoring.js"
import { findInterviewProcessNotes } from "./interviewProcess.js"
import { generateCompanyBrief } from "./companyBrief.js"
import { generateQuestionsForRequirements, generateSystemDesignQuestions } from "./generateQuestions.js"
import { generateFlashcards } from "./flashcards.js"
import { checkCoverage, splitGapsByPriority } from "./coverage.js"
import { buildSchedule } from "./scheduler.js"
import { validateKit } from "./validateKit.js"
import { makeIdFactory } from "../../utils/idFactory.js"

export class PipelineError extends Error {
    constructor(code, message) {
        super(message)
        this.code = code
    }
}

const MAX_COVERAGE_PASSES = 3 // first draft + up to 2 gap-filling rounds - see README "second pass"

const deriveCompanyName = (pages, companyUrl) => {
    if (pages.length > 0 && pages[0].title) {
        const cleaned = pages[0].title.split(/[-|·:]/)[0].trim()
        if (cleaned.length > 1 && cleaned.length < 60) return cleaned
    }
    try {
        const host = new URL(companyUrl).hostname.replace(/^www\./, "")
        const name = host.split(".")[0]
        return name.charAt(0).toUpperCase() + name.slice(1)
    } catch {
        return ""
    }
}

const noop = () => {}

// The single source of truth for turning (jd, companyUrl, days) into a validated
// kit. Both the HTTP API (kit.controller.js) and the batch entry point
// (scripts/evaluate.js) call this exact function - Section 9 requires that
// explicitly ("the same code your application uses, not a parallel implementation").
//
// Sequencing follows Section 3 in order: extract requirements from the pasted text
// (no retrieval needed) -> crawl the company site -> look for public discussion of
// the interview process -> brief + questions (each category its own call) ->
// deterministic coverage check -> second pass on gaps -> deterministic schedule.
export const runPipeline = async ({ jd, companyUrl, days }, { onProgress = noop } = {}) => {
    const warnings = []
    const report = (step, status, message) => onProgress({ step, status, message: message || "", at: new Date() })

    if (!jd || jd.trim().length === 0) {
        throw new PipelineError("EMPTY_JOB_DESCRIPTION", "Job description text is empty")
    }
    if (!companyUrl || companyUrl.trim().length === 0) {
        throw new PipelineError("EMPTY_COMPANY_URL", "Company URL is empty")
    }

    // 1. Pasted text needs no retrieval - straight to extraction.
    report("extract_requirements", "running")
    let extracted
    try {
        extracted = await extractRequirements(jd)
    } catch (error) {
        report("extract_requirements", "failed", error.message)
        throw new PipelineError("REQUIREMENT_EXTRACTION_FAILED", `Could not extract requirements from the job description: ${error.message}`)
    }
    report("extract_requirements", "done", `${extracted.requirements.length} requirement(s) found`)

    // 2. A homepage needs crawling before it is useful. Never fatal - an
    // unreachable/404/thin site produces an honest, empty brief (Section 10 / FAQ).
    report("crawl_company_site", "running")
    let crawlResult = { pages: [], skipped: [] }
    try {
        new URL(companyUrl)
        crawlResult = await crawlCompanySite(companyUrl)
    } catch (error) {
        crawlResult = { pages: [], skipped: [{ url: companyUrl, code: "INVALID_URL", message: `Company URL is invalid: ${error.message}` }] }
    }
    warnings.push(...crawlResult.skipped)
    report("crawl_company_site", crawlResult.pages.length > 0 ? "done" : "skipped", `${crawlResult.pages.length} page(s) retrieved, ${crawlResult.skipped.length} skipped`)

    const companyName = deriveCompanyName(crawlResult.pages, companyUrl)

    // 3. Public discussion of the interview process - best-effort, independent of the company's own site.
    report("public_discussion", "running")
    const discussion = await findPublicDiscussion(companyName).catch((error) => ({ pages: [], skipped: [{ url: null, code: "DISCUSSION_SEARCH_ERROR", message: error.message }] }))
    warnings.push(...discussion.skipped)
    report("public_discussion", discussion.pages.length > 0 ? "done" : "skipped", `${discussion.pages.length} page(s) found`)

    const hiringPages = crawlResult.pages.filter((p) => isLikelyHiringPage(p.url, p.title))

    // 4. A hiring-process page, once found, changes what questions make sense (Section 3).
    report("interview_process", "running")
    const interviewProcess = await findInterviewProcessNotes(companyName, hiringPages, discussion.pages)
    report("interview_process", "done")

    report("company_brief", "running")
    let companyBrief
    try {
        companyBrief = await generateCompanyBrief(companyName, crawlResult.pages)
    } catch (error) {
        companyBrief = { summary: "The company brief could not be generated because the LLM provider failed.", what_they_do: "" }
        warnings.push({ url: null, code: "COMPANY_BRIEF_FAILED", message: error.message })
    }
    report("company_brief", "done")

    // 5. Requirements of different kinds do not share a call/instructions.
    const reqsByKind = { technical: [], behavioural: [], domain: [] }
    extracted.requirements.forEach((r) => reqsByKind[r.kind].push(r))

    report("generate_questions", "running")
    const qIdFactory = makeIdFactory("q")
    let questions
    try {
        const [technical, behavioural, domain] = await Promise.all([
            generateQuestionsForRequirements(reqsByKind.technical, "technical", { companyName, roleTitle: extracted.title }),
            generateQuestionsForRequirements(reqsByKind.behavioural, "behavioural", { companyName, roleTitle: extracted.title }),
            generateQuestionsForRequirements(reqsByKind.domain, "domain", { companyName, roleTitle: extracted.title })
        ])
        let drafts = [...technical, ...behavioural, ...domain]

        const seniorish = /senior|staff|lead|principal|architect/i.test(`${extracted.seniority} ${extracted.title}`)
        if ((interviewProcess.signals?.systemDesign || seniorish) && reqsByKind.technical.length > 0) {
            drafts = [...drafts, ...await generateSystemDesignQuestions(reqsByKind.technical, { companyName, roleTitle: extracted.title })]
        }
        questions = drafts.map((q) => ({ ...q, id: qIdFactory() }))
    } catch (error) {
        report("generate_questions", "failed", error.message)
        throw new PipelineError("QUESTION_GENERATION_FAILED", `Could not generate questions: ${error.message}`)
    }
    report("generate_questions", "done", `${questions.length} question(s) generated`)

    report("generate_flashcards", "running")
    let flashcards = []
    try {
        const fIdFactory = makeIdFactory("f")
        flashcards = (await generateFlashcards(extracted.requirements, { companyName, roleTitle: extracted.title }))
            .map((f) => ({ ...f, id: fIdFactory() }))
    } catch (error) {
        warnings.push({ url: null, code: "FLASHCARD_GENERATION_FAILED", message: error.message })
    }
    report("generate_flashcards", "done", `${flashcards.length} flashcard(s) generated`)

    // 6. Deterministic coverage check, then act on the gaps (Section 4 - "the second pass").
    report("coverage_check", "running")
    let passes = 1
    let coverage = checkCoverage(extracted.requirements, questions)

    while (coverage.uncovered_requirement_ids.length > 0 && passes < MAX_COVERAGE_PASSES) {
        const { mustGaps, niceGaps } = splitGapsByPriority(coverage.uncovered_requirement_ids, extracted.requirements)
        const gaps = [...mustGaps, ...niceGaps]
        const gapsByKind = { technical: [], behavioural: [], domain: [] }
        gaps.forEach((r) => gapsByKind[r.kind].push(r))

        try {
            const [technical, behavioural, domain] = await Promise.all([
                generateQuestionsForRequirements(gapsByKind.technical, "technical", { companyName, roleTitle: extracted.title }),
                generateQuestionsForRequirements(gapsByKind.behavioural, "behavioural", { companyName, roleTitle: extracted.title }),
                generateQuestionsForRequirements(gapsByKind.domain, "domain", { companyName, roleTitle: extracted.title })
            ])
            const newQuestions = [...technical, ...behavioural, ...domain].map((q) => ({ ...q, id: qIdFactory() }))
            questions = [...questions, ...newQuestions]
        } catch (error) {
            warnings.push({ url: null, code: "COVERAGE_GAP_FILL_FAILED", message: error.message })
            break
        }
        passes += 1
        coverage = checkCoverage(extracted.requirements, questions)
    }
    report("coverage_check", coverage.uncovered_requirement_ids.length === 0 ? "done" : "skipped",
        `${coverage.uncovered_requirement_ids.length} requirement(s) remain uncovered after ${passes} pass(es)`)

    // 7. Arithmetic, done in code - never handed to the model.
    report("build_schedule", "running")
    const schedule = buildSchedule(extracted.requirements, questions, days)
    report("build_schedule", "done")

    const kit = {
        source: {
            company: companyName,
            company_url: companyUrl,
            role: extracted.title,
            location: extracted.location,
            jd_chars: jd.length,
            researched_at: new Date().toISOString(),
            pages_used: [...crawlResult.pages.map((p) => p.url), ...discussion.pages.map((p) => p.url)]
        },
        company_brief: { ...companyBrief, sources: crawlResult.pages.map((p) => p.url) },
        interview_process: interviewProcess,
        role: {
            title: extracted.title,
            seniority: extracted.seniority,
            responsibilities: extracted.responsibilities,
            requirements: extracted.requirements
        },
        questions,
        flashcards,
        schedule,
        coverage: { uncovered_requirement_ids: coverage.uncovered_requirement_ids, passes }
    }

    report("validate", "running")
    const validation = validateKit(kit)
    if (!validation.valid) {
        report("validate", "failed", validation.errors.slice(0, 5).join("; "))
        throw new PipelineError("INVALID_KIT_STRUCTURE", `Generated kit failed structure validation: ${validation.errors.slice(0, 5).join("; ")}`)
    }
    report("validate", "done")

    return { kit: validation.kit, warnings }
}
