// Deterministic, code-only allocation (Section 3 & 8: "this is arithmetic, and the
// application should do it" - never handed to the model). Distributes every
// generated question across exactly `daysRequested` days, front-loading
// higher-priority/harder material, and guarantees every question ends up
// scheduled somewhere (so every must-have requirement's question is included).

const MINUTES_BY_DIFFICULTY = { 1: 15, 2: 25, 3: 40 }
const CATEGORY_ORDER = { technical: 0, "system-design": 1, domain: 2, "company-fit": 2, behavioural: 3 }
const MIN_DAYS = 1
const MAX_DAYS = 120 // sanity cap - Section 10 mentions a 60-day case explicitly, this leaves headroom

const priorityWeight = (question, requirementsById) => {
    let weight = 0
    for (const id of question.requirement_ids || []) {
        const req = requirementsById.get(id)
        if (req?.priority === "must") weight = Math.max(weight, 2)
        else if (req && weight < 1) weight = 1
    }
    return weight
}

const focusForItems = (items, requirementsById) => {
    if (items.length === 0) return "Review"
    const categories = [...new Set(items.map((i) => i.category))]
    const label = categories.map((c) => c.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")).join(" & ")
    const anyMust = items.some((i) => priorityWeight(i, requirementsById) === 2)
    return anyMust ? `${label} (core requirements)` : label
}

export const buildSchedule = (requirements, questions, daysRequestedRaw) => {
    const daysRequested = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Math.round(Number(daysRequestedRaw) || 1)))
    const requirementsById = new Map((requirements || []).map((r) => [r.id, r]))

    const items = (questions || []).map((q) => ({
        id: q.id,
        category: q.category,
        requirement_ids: q.requirement_ids || [],
        minutes: MINUTES_BY_DIFFICULTY[q.difficulty] || 25,
        difficulty: q.difficulty || 2
    }))

    // Highest priority + hardest first, so earlier days end up with the tougher,
    // must-have-covering material rather than it landing "the night before".
    items.sort((a, b) => {
        const wa = priorityWeight(a, requirementsById)
        const wb = priorityWeight(b, requirementsById)
        if (wb !== wa) return wb - wa
        if (b.difficulty !== a.difficulty) return b.difficulty - a.difficulty
        const ca = CATEGORY_ORDER[a.category] ?? 9
        const cb = CATEGORY_ORDER[b.category] ?? 9
        if (ca !== cb) return ca - cb
        return a.id.localeCompare(b.id)
    })

    const days = []

    if (items.length === 0) {
        for (let d = 1; d <= daysRequested; d += 1) {
            days.push({ day: d, focus: "No material generated yet", question_ids: [], minutes: 0 })
        }
        return { days_available: daysRequested, days }
    }

    if (items.length >= daysRequested) {
        // Contiguous front-loaded chunks: day 1 gets the extra items when it doesn't
        // divide evenly, so the heaviest days are early, not late.
        const base = Math.floor(items.length / daysRequested)
        const remainder = items.length % daysRequested
        let cursor = 0
        for (let d = 1; d <= daysRequested; d += 1) {
            const count = base + (d <= remainder ? 1 : 0)
            const dayItems = items.slice(cursor, cursor + count)
            cursor += count
            days.push({
                day: d,
                focus: focusForItems(dayItems, requirementsById),
                question_ids: dayItems.map((i) => i.id),
                minutes: dayItems.reduce((sum, i) => sum + i.minutes, 0)
            })
        }
    } else {
        // Fewer questions than days available (thin JD + long runway, or a 60-day
        // schedule): give each item its own day first (priority order), then loop
        // back over the same material as spaced-repetition review days so every
        // requested day still has real content and the count still matches exactly.
        for (let d = 1; d <= daysRequested; d += 1) {
            const item = items[(d - 1) % items.length]
            const isReview = d > items.length
            days.push({
                day: d,
                focus: isReview ? `Review: ${focusForItems([item], requirementsById)}` : focusForItems([item], requirementsById),
                question_ids: [item.id],
                minutes: isReview ? Math.max(10, Math.round(item.minutes / 2)) : item.minutes
            })
        }
    }

    return { days_available: daysRequested, days }
}
