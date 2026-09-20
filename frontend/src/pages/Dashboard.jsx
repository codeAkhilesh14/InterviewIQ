import React, { useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { PlusCircle, Inbox, AlertTriangle, Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react"
import api from "../lib/axios.js"
import { setKitList, setKitListStatus, removeKitFromList } from "../redux/kitSlice.js"
import { Button } from "../components/ui/Button.jsx"
import { Skeleton } from "../components/ui/Skeleton.jsx"
import KitCard from "../components/kit/KitCard.jsx"
import { cn } from "../lib/utils.js"
import { toast } from "sonner"

const STAT_CONFIG = [
    { key: "total", label: "Total kits", Icon: Sparkles, color: "var(--chart-1)" },
    { key: "generating", label: "Generating", Icon: Loader2, color: "var(--chart-warning)", spin: true },
    { key: "ready", label: "Ready", Icon: CheckCircle2, color: "var(--chart-good)" },
    { key: "failed", label: "Failed", Icon: XCircle, color: "var(--chart-critical)" }
]

const POLL_INTERVAL_MS = 4000

const Dashboard = () => {
    const dispatch = useDispatch()
    const { list, listStatus } = useSelector((state) => state.kit)

    const fetchKits = useCallback(async (silent = false) => {
        if (!silent) dispatch(setKitListStatus("loading"))
        try {
            const { data } = await api.get("/kit")
            dispatch(setKitList(data))
        } catch {
            if (!silent) dispatch(setKitListStatus("error"))
        }
    }, [dispatch])

    useEffect(() => { fetchKits() }, [fetchKits])

    // Keep dashboard statuses fresh while anything is still generating, without a
    // dedicated per-card websocket - a quiet background refresh is enough here.
    useEffect(() => {
        const hasActive = list.some((k) => k.status === "pending" || k.status === "generating")
        if (!hasActive) return
        const interval = setInterval(() => fetchKits(true), POLL_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [list, fetchKits])

    const stats = useMemo(() => ({
        total: list.length,
        generating: list.filter((k) => k.status === "pending" || k.status === "generating").length,
        ready: list.filter((k) => k.status === "ready").length,
        failed: list.filter((k) => k.status === "failed").length
    }), [list])

    const handleDelete = async (id) => {
        const previous = list
        dispatch(removeKitFromList(id))
        try {
            await api.delete(`/kit/${id}`)
            toast.success("Kit deleted")
        } catch (err) {
            dispatch(setKitList(previous))
            toast.error(err.response?.data?.message || "Could not delete kit")
        }
    }

    return (
        <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Your kits</h1>
                    <p className="text-sm text-muted-foreground">Everything you're preparing for, in one place.</p>
                </div>
                <Button asChild>
                    <Link to="/kits/new"><PlusCircle className="h-4 w-4" /> New kit</Link>
                </Button>
            </div>

            {listStatus === "loaded" && list.length > 0 && (
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {STAT_CONFIG.map(({ key, label, Icon, color, spin }) => (
                        <div key={key} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)` }}>
                                <Icon className={cn("h-4 w-4", spin && stats[key] > 0 && "animate-spin")} style={{ color }} />
                            </div>
                            <div>
                                <p className="text-lg font-semibold leading-none">{stats[key]}</p>
                                <p className="text-xs text-muted-foreground">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {listStatus === "loading" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
                </div>
            )}

            {listStatus === "error" && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                    <p className="text-muted-foreground">Couldn't load your kits.</p>
                    <Button variant="outline" onClick={() => fetchKits()}>Try again</Button>
                </div>
            )}

            {listStatus === "loaded" && list.length === 0 && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
                    <Inbox className="h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No kits yet - paste a job description to create your first one.</p>
                    <Button asChild><Link to="/kits/new">Create a kit</Link></Button>
                </div>
            )}

            {listStatus === "loaded" && list.length > 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((kit) => <KitCard key={kit._id} kit={kit} onDelete={handleDelete} />)}
                </div>
            )}
        </div>
    )
}

export default Dashboard
