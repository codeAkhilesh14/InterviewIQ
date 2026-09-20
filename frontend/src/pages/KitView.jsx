import React, { useCallback, useEffect, useState } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { ArrowLeft, Dumbbell, RotateCcw, Loader2, XCircle } from "lucide-react"
import api from "../lib/axios.js"
import { setCurrentKit, setCurrentKitStatus, clearCurrentKit, upsertKitInList } from "../redux/kitSlice.js"
import useKitPolling from "../hooks/useKitPolling.js"
import { Button } from "../components/ui/Button.jsx"
import { Skeleton } from "../components/ui/Skeleton.jsx"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs.jsx"
import StatusBadge from "../components/kit/StatusBadge.jsx"
import GenerationProgress from "../components/kit/GenerationProgress.jsx"
import KitOverview from "../components/kit/KitOverview.jsx"
import CompanyBriefCard from "../components/kit/CompanyBriefCard.jsx"
import RoleOverview from "../components/kit/RoleOverview.jsx"
import QuestionsBoard from "../components/kit/QuestionsBoard.jsx"
import FlashcardsSection from "../components/kit/FlashcardsSection.jsx"
import ScheduleView from "../components/kit/ScheduleView.jsx"
import { toast } from "sonner"

const KitView = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const { current: kit, currentStatus } = useSelector((state) => state.kit)
    const [retrying, setRetrying] = useState(false)

    const fetchKit = useCallback(async () => {
        dispatch(setCurrentKitStatus("loading"))
        try {
            const { data } = await api.get(`/kit/${id}`)
            dispatch(setCurrentKit(data))
        } catch {
            dispatch(setCurrentKitStatus("error"))
        }
    }, [id, dispatch])

    useEffect(() => {
        fetchKit()
        return () => dispatch(clearCurrentKit())
    }, [fetchKit, dispatch])

    const handleKitUpdate = useCallback((updated) => {
        dispatch(setCurrentKit(updated))
        dispatch(upsertKitInList(updated))
    }, [dispatch])

    useKitPolling(id, kit?.status, handleKitUpdate)

    const handleRetry = async () => {
        if (!kit) return
        setRetrying(true)
        try {
            const { data } = await api.post("/kit", { jd: kit.input.jd, company_url: kit.input.company_url, days: kit.input.days_requested })
            handleKitUpdate(data)
            toast.info("Retrying generation")
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not retry")
        } finally {
            setRetrying(false)
        }
    }

    if (currentStatus === "loading" || currentStatus === "idle") {
        return (
            <div className="mx-auto max-w-4xl">
                <Skeleton className="mb-4 h-8 w-64" />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (currentStatus === "error" || !kit) {
        return (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
                <XCircle className="h-8 w-8 text-destructive" />
                <p className="text-muted-foreground">Couldn't load this kit.</p>
                <Button variant="outline" onClick={fetchKit}>Try again</Button>
            </div>
        )
    }

    const disabled = kit.status !== "ready"

    return (
        <div className="mx-auto max-w-4xl">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Button>

            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-semibold">{kit.source?.role || "Untitled role"}</h1>
                    <p className="text-muted-foreground">{kit.source?.company || kit.input.company_url}</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={kit.status} />
                    {kit.status === "ready" && (
                        <Button asChild>
                            <Link to={`/kits/${kit._id}/practice`}><Dumbbell className="h-4 w-4" /> Practice</Link>
                        </Button>
                    )}
                    {kit.status === "failed" && (
                        <Button onClick={handleRetry} disabled={retrying}>
                            {retrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Retry
                        </Button>
                    )}
                </div>
            </div>

            {(kit.status === "pending" || kit.status === "generating") && <GenerationProgress kit={kit} />}

            {kit.status === "failed" && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
                    <p className="font-medium text-destructive">Generation failed</p>
                    <p className="mt-1 text-muted-foreground">{kit.error?.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Error code: {kit.error?.code}</p>
                </div>
            )}

            {kit.status === "ready" && (
                <Tabs defaultValue="overview">
                    <TabsList>
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="brief">Company Brief</TabsTrigger>
                        <TabsTrigger value="role">Role</TabsTrigger>
                        <TabsTrigger value="questions">Questions</TabsTrigger>
                        <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                        <TabsTrigger value="schedule">Schedule</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview"><KitOverview kit={kit} /></TabsContent>
                    <TabsContent value="brief"><CompanyBriefCard kit={kit} onKitUpdate={handleKitUpdate} disabled={disabled} /></TabsContent>
                    <TabsContent value="role"><RoleOverview role={kit.role} /></TabsContent>
                    <TabsContent value="questions"><QuestionsBoard kit={kit} onKitUpdate={handleKitUpdate} disabled={disabled} /></TabsContent>
                    <TabsContent value="flashcards"><FlashcardsSection kit={kit} onKitUpdate={handleKitUpdate} disabled={disabled} /></TabsContent>
                    <TabsContent value="schedule"><ScheduleView kit={kit} onKitUpdate={handleKitUpdate} disabled={disabled} /></TabsContent>
                </Tabs>
            )}
        </div>
    )
}

export default KitView
