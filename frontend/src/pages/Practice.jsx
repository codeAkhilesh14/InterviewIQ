import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, RotateCcw, PartyPopper, Frown, Meh, Smile, RefreshCcw } from "lucide-react"
import api from "../lib/axios.js"
import { Button } from "../components/ui/Button.jsx"
import { Card, CardContent } from "../components/ui/Card.jsx"
import { Skeleton } from "../components/ui/Skeleton.jsx"
import { Badge } from "../components/ui/Badge.jsx"
import Meter from "../components/charts/Meter.jsx"
import DonutChart from "../components/charts/DonutChart.jsx"
import { cn } from "../lib/utils.js"

const CONFIDENCE_OPTIONS = [
    { value: 1, label: "Low", key: "1", Icon: Frown, activeClass: "border-[var(--chart-critical)] bg-[var(--chart-critical)]/10 text-[var(--chart-critical)]" },
    { value: 2, label: "Medium", key: "2", Icon: Meh, activeClass: "border-[var(--chart-warning)] bg-[var(--chart-warning)]/10 text-[var(--chart-warning)]" },
    { value: 3, label: "High", key: "3", Icon: Smile, activeClass: "border-[var(--chart-good)] bg-[var(--chart-good)]/10 text-[var(--chart-good)]" }
]

// Confidence-weighted ordering: cards never practiced come first (they're the
// biggest unknown), then whatever the candidate was least confident about last
// time, then a recency tiebreak so a card doesn't come up twice in a row. A
// simpler, defensible stand-in for a full spaced-repetition interval - see README.
const buildQueue = (flashcards, practiceLog) => {
    const latestByCard = new Map()
    for (const entry of practiceLog) {
        const existing = latestByCard.get(entry.flashcard_id)
        if (!existing || new Date(entry.practiced_at) > new Date(existing.practiced_at)) {
            latestByCard.set(entry.flashcard_id, entry)
        }
    }
    return [...flashcards].sort((a, b) => {
        const la = latestByCard.get(a.id)
        const lb = latestByCard.get(b.id)
        if (!la && !lb) return 0
        if (!la) return -1
        if (!lb) return 1
        if (la.confidence !== lb.confidence) return la.confidence - lb.confidence
        return new Date(la.practiced_at) - new Date(lb.practiced_at)
    })
}

const confidenceBreakdown = (flashcards, practiceLog) => {
    const latestByCard = new Map()
    for (const entry of practiceLog) {
        const existing = latestByCard.get(entry.flashcard_id)
        if (!existing || new Date(entry.practiced_at) > new Date(existing.practiced_at)) {
            latestByCard.set(entry.flashcard_id, entry)
        }
    }
    const counts = { Low: 0, Medium: 0, High: 0 }
    flashcards.forEach((card) => {
        const latest = latestByCard.get(card.id)
        if (!latest) return
        counts[latest.confidence === 1 ? "Low" : latest.confidence === 2 ? "Medium" : "High"] += 1
    })
    return [
        { name: "Low", value: counts.Low, color: "var(--chart-critical)" },
        { name: "Medium", value: counts.Medium, color: "var(--chart-warning)" },
        { name: "High", value: counts.High, color: "var(--chart-good)" }
    ]
}

const Practice = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const [kit, setKit] = useState(null)
    const [loading, setLoading] = useState(true)
    const [queue, setQueue] = useState([])
    const [index, setIndex] = useState(0)
    const [revealed, setRevealed] = useState(false)
    const [sessionDone, setSessionDone] = useState(false)
    const [sessionCount, setSessionCount] = useState(0)

    useEffect(() => {
        let cancelled = false
        api.get(`/kit/${id}`).then(({ data }) => {
            if (cancelled) return
            setKit(data)
            setQueue(buildQueue(data.flashcards, data.practiceLog))
            setLoading(false)
        }).catch(() => setLoading(false))
        return () => { cancelled = true }
    }, [id])

    const coveredCount = useMemo(() => {
        if (!kit) return 0
        return new Set(kit.practiceLog.map((p) => p.flashcard_id)).size
    }, [kit])

    const currentCard = queue[index]

    const handleReveal = useCallback(() => setRevealed(true), [])

    const handleRate = useCallback(async (confidence) => {
        if (!currentCard) return
        try {
            const { data } = await api.post(`/kit/${id}/practice`, { flashcard_id: currentCard.id, confidence })
            setKit(data)
        } catch {
            // Logging failure shouldn't block the session - the card is still moved past.
        }
        setSessionCount((c) => c + 1)
        if (index + 1 >= queue.length) {
            setSessionDone(true)
        } else {
            setIndex((i) => i + 1)
            setRevealed(false)
        }
    }, [currentCard, id, index, queue.length])

    // Keyboard shortcuts: space/enter reveals, 1-3 rate confidence once revealed.
    useEffect(() => {
        const onKeyDown = (e) => {
            if (sessionDone || loading) return
            if (!revealed && (e.key === " " || e.key === "Enter")) { e.preventDefault(); handleReveal() }
            if (revealed && ["1", "2", "3"].includes(e.key)) handleRate(Number(e.key))
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [revealed, sessionDone, loading, handleReveal, handleRate])

    const restartSession = () => {
        setQueue(buildQueue(kit.flashcards, kit.practiceLog))
        setIndex(0)
        setRevealed(false)
        setSessionDone(false)
        setSessionCount(0)
    }

    if (loading) {
        return <div className="mx-auto max-w-xl"><Skeleton className="h-96 w-full" /></div>
    }

    if (!kit || kit.flashcards.length === 0) {
        return (
            <div className="mx-auto max-w-xl text-center">
                <p className="mb-4 text-muted-foreground">This kit has no flashcards to practise yet.</p>
                <Button variant="outline" onClick={() => navigate(`/kits/${id}`)}>Back to kit</Button>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-xl">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(`/kits/${id}`)}>
                <ArrowLeft className="h-4 w-4" /> Back to kit
            </Button>

            <Meter
                label="Cards covered"
                value={coveredCount}
                max={kit.flashcards.length}
                tone={coveredCount === kit.flashcards.length ? "good" : "primary"}
                suffix="cards"
                className="mb-6"
            />

            {sessionDone ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--chart-good)]/10">
                            <PartyPopper className="h-8 w-8" style={{ color: "var(--chart-good)" }} />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">Session complete</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                You reviewed {sessionCount} card{sessionCount === 1 ? "" : "s"}. Next session leads with
                                whatever you were least confident about.
                            </p>
                        </div>
                        <div className="w-full max-w-xs">
                            <DonutChart data={confidenceBreakdown(kit.flashcards, kit.practiceLog)} centerValue={coveredCount} centerLabel="rated" height={180} />
                        </div>
                        <Button onClick={restartSession}><RotateCcw className="h-4 w-4" /> Practise again</Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
                        <span>Card {Math.min(index + 1, queue.length)} of {queue.length}</span>
                        {currentCard?.requirement_ids?.length > 0 && (
                            <Badge variant="outline">{currentCard.requirement_ids.length} requirement{currentCard.requirement_ids.length > 1 ? "s" : ""}</Badge>
                        )}
                    </div>

                    <div className="flip-card h-72" key={currentCard.id}>
                        <div className={cn("flip-card-inner", revealed && "is-flipped")}>
                            <div className="flip-card-face">
                                <Card className="flex h-72 flex-col items-center justify-center gap-4 p-8 text-center shadow-md">
                                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Question</span>
                                    <p className="text-xl font-medium leading-snug">{currentCard.front}</p>
                                </Card>
                            </div>
                            <div className="flip-card-face flip-card-back">
                                <Card className="flex h-72 flex-col items-center justify-center gap-4 border-primary/30 p-8 text-center shadow-md">
                                    <span className="text-xs font-medium uppercase tracking-wide text-primary">Answer</span>
                                    <p className="text-lg leading-snug">{currentCard.back}</p>
                                </Card>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col items-center gap-3">
                        {!revealed ? (
                            <Button size="lg" onClick={handleReveal}>
                                <RefreshCcw className="h-4 w-4" /> Reveal answer <span className="ml-1 text-xs opacity-70">(space)</span>
                            </Button>
                        ) : (
                            <>
                                <p className="text-sm text-muted-foreground">How confident did you feel?</p>
                                <div className="flex gap-3">
                                    {CONFIDENCE_OPTIONS.map(({ value, label, key, Icon, activeClass }) => (
                                        <button
                                            key={value}
                                            onClick={() => handleRate(value)}
                                            className={cn(
                                                "flex w-24 flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-3",
                                                "text-sm font-medium transition-all hover:-translate-y-0.5 hover:shadow-md",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                activeClass
                                            )}
                                        >
                                            <Icon className="h-6 w-6" />
                                            {label}
                                            <span className="text-xs opacity-60">({key})</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

export default Practice
