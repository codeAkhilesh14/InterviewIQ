// Deterministic gap detection (Section 3: "your code's decision to make, not the
// model's"). A requirement is covered if at least one question's requirement_ids
// includes it. Returns ids in the original requirement order for stable output.
export const checkCoverage = (requirements, questions) => {
    const covered = new Set()
    for (const q of questions || []) {
        for (const id of q.requirement_ids || []) covered.add(id)
    }
    const uncovered = (requirements || [])
        .map((r) => r.id)
        .filter((id) => !covered.has(id))
    return { uncovered_requirement_ids: uncovered }
}

// Must-have gaps are what actually gate the second pass ("A kit that ships with
// uncovered must-have requirements has failed at the one job it had" - Section 4).
// Nice-to-have gaps are still reported honestly but don't force another LLM round.
export const splitGapsByPriority = (uncoveredIds, requirements) => {
    const requirementsById = new Map(requirements.map((r) => [r.id, r]))
    const mustGaps = []
    const niceGaps = []
    for (const id of uncoveredIds) {
        const req = requirementsById.get(id)
        if (!req) continue
        if (req.priority === "must") mustGaps.push(req)
        else niceGaps.push(req)
    }
    return { mustGaps, niceGaps }
}
