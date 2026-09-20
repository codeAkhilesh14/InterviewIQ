// Produces stable, human-readable ids (r1, r2, q1, q2, ...) scoped to a single kit.
// Requirement/question/flashcard ids must stay stable within a kit (Appendix A), so
// a fresh factory is created per kit-build rather than using globally unique ids.
export const makeIdFactory = (prefix, startAt = 1) => {
    let counter = startAt - 1
    return () => {
        counter += 1
        return `${prefix}${counter}`
    }
}

// Continues an id sequence from the highest existing "<prefix><n>" id, used when a
// regeneration adds new items to a section that already has some (e.g. adding
// questions to fill a coverage gap without reusing an id already in use).
export const nextIdFactoryFrom = (existingIds, prefix) => {
    let max = 0
    for (const id of existingIds) {
        const match = typeof id === "string" && id.startsWith(prefix) ? id.slice(prefix.length) : null
        const n = match ? parseInt(match, 10) : NaN
        if (!Number.isNaN(n) && n > max) max = n
    }
    return makeIdFactory(prefix, max + 1)
}
