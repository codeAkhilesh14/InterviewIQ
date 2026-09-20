import React, { useEffect, useMemo, useState, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, RotateCcw, Check } from "lucide-react"
import api from "../lib/axios.js"
import { Button } from "../components/ui/Button.jsx"
import { Card, CardContent } from "../components/ui/Card.jsx"
import { Progress } from "../components/ui/Progress.jsx"
import { Skeleton } from "../components/ui/Skeleton.jsx"
import { cn } from "../lib/utils.js"

const CONFIDENCE_OPTIONS = [
    { value: 1, label: "Low", key: "1", className: "bg-destructive/10 hover:bg-destructive/20 text-destructive border-destructive/30" },
    { value: 2, label: "Medium", key: "2", className: "bg-warning/10 hover:bg-warning/20 text-warning border-warning/30" },
    { value: 3, label: "High", key: "3", className: "bg-success/10 hover:bg-success/20 text-success border-success/30" }
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
        return <div className="mx-auto max-w-xl"><Skeleton className="h-80 w-full" /></div>
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

            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
                <span>{coveredCount} of {kit.flashcards.length} cards covered</span>
                {!sessionDone && <span>Card {Math.min(index + 1, queue.length)} of {queue.length}</span>}
            </div>
            <Progress value={sessionDone ? 100 : (index / queue.length) * 100} className="mb-6" />

            {sessionDone ? (
                <Card>
                    <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
                        <Check className="h-10 w-10 text-success" />
                        <p className="text-lg font-medium">Session complete</p>
                        <p className="text-sm text-muted-foreground">You reviewed {sessionCount} card(s). Next time, we'll lead with whatever you were least confident about.</p>
                        <Button onClick={restartSession}><RotateCcw className="h-4 w-4" /> Practise again</Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="flex min-h-64 flex-col justify-between gap-6 py-8">
                        <div className="flex flex-1 items-center justify-center text-center">
                            <p className="text-lg font-medium">{revealed ? currentCard.back : currentCard.front}</p>
                        </div>
                        {!revealed ? (
                            <Button onClick={handleReveal} className="self-center">Reveal answer <span className="ml-1 text-xs opacity-70">(space)</span></Button>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-sm text-muted-foreground">How confident did you feel?</p>
                                <div className="flex gap-2">
                                    {CONFIDENCE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleRate(opt.value)}
                                            className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", opt.className)}
                                        >
                                            {opt.label} <span className="ml-1 text-xs opacity-60">({opt.key})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default Practice
