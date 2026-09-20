import React from "react"
import { CheckCircle2, XCircle, Loader2, Circle, MinusCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card.jsx"

const STEP_LABELS = {
    extract_requirements: "Extracting requirements from the job description",
    crawl_company_site: "Crawling the company site",
    public_discussion: "Searching for public discussion of their interview process",
    interview_process: "Summarising what's known about their interview process",
    company_brief: "Writing the company brief",
    generate_questions: "Generating interview questions by category",
    generate_flashcards: "Generating flashcards",
    coverage_check: "Checking every requirement has a question (and closing gaps)",
    build_schedule: "Building your day-by-day schedule",
    validate: "Validating the kit's structure",
    warnings: "Noting anything that couldn't be retrieved"
}

const ICONS = {
    running: <Loader2 className="h-4 w-4 animate-spin text-primary" />,
    done: <CheckCircle2 className="h-4 w-4 text-success" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
    skipped: <MinusCircle className="h-4 w-4 text-muted-foreground" />,
    pending: <Circle className="h-4 w-4 text-muted-foreground" />
}

// De-duplicates repeated "running" entries for the same step (progress events can
// fire more than once per step) so the list reads as one row per step, latest status.
const collapseSteps = (progress) => {
    const order = []
    const byStep = new Map()
    for (const event of progress || []) {
        if (!byStep.has(event.step)) order.push(event.step)
        byStep.set(event.step, event)
    }
    return order.map((step) => byStep.get(step))
}

const GenerationProgress = ({ kit }) => {
    const steps = collapseSteps(kit.progress)

    return (
        <div className="mx-auto max-w-xl">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle>Building your prep kit</CardTitle>
                    <CardDescription>
                        This takes a minute or two - we crawl the company site, look for interview
                        discussion, then generate and cross-check each section.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="flex flex-col gap-3" aria-live="polite">
                        {steps.length === 0 && (
                            <li className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> Starting up...
                            </li>
                        )}
                        {steps.map((event) => (
                            <li key={event.step} className="flex items-start gap-3 text-sm">
                                {ICONS[event.status] || ICONS.pending}
                                <div>
                                    <p className="text-foreground">{STEP_LABELS[event.step] || event.step}</p>
                                    {event.message && <p className="text-xs text-muted-foreground">{event.message}</p>}
                                </div>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
    )
}

export default GenerationProgress
