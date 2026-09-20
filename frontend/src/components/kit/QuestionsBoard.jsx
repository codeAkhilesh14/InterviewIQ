import React, { useMemo, useState } from "react"
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { Plus, RefreshCw, Loader2, AlertTriangle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/Tabs.jsx"
import { Button } from "../ui/Button.jsx"
import { Badge } from "../ui/Badge.jsx"
import { Textarea } from "../ui/Textarea.jsx"
import { Label } from "../ui/Label.jsx"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/Select.jsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/Dialog.jsx"
import QuestionCard from "./QuestionCard.jsx"
import api from "../../lib/axios.js"
import { toast } from "sonner"

const CATEGORIES = [
    { value: "technical", label: "Technical" },
    { value: "behavioural", label: "Behavioural" },
    { value: "system-design", label: "System Design" },
    { value: "company-fit", label: "Company Fit" }
]

const AddQuestionDialog = ({ open, onOpenChange, category, requirements, onCreate }) => {
    const [prompt, setPrompt] = useState("")
    const [answerOutline, setAnswerOutline] = useState("")
    const [requirementIds, setRequirementIds] = useState([])
    const [saving, setSaving] = useState(false)

    const toggleRequirement = (id) => {
        setRequirementIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
    }

    const handleCreate = async () => {
        if (!prompt.trim()) return
        setSaving(true)
        try {
            await onCreate({ category, prompt, answer_outline: answerOutline, requirement_ids: requirementIds, difficulty: 2 })
            setPrompt(""); setAnswerOutline(""); setRequirementIds([])
            onOpenChange(false)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a {CATEGORIES.find((c) => c.value === category)?.label.toLowerCase()} question</DialogTitle>
                    <DialogDescription>Hand-added questions are pinned automatically, so they always survive a regeneration.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>Question</Label>
                        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-20" autoFocus />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Answer outline (optional)</Label>
                        <Textarea value={answerOutline} onChange={(e) => setAnswerOutline(e.target.value)} className="min-h-16" />
                    </div>
                    {requirements.length > 0 && (
                        <div className="flex flex-col gap-2">
                            <Label>Covers which requirement(s)?</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {requirements.map((req) => (
                                    <button
                                        type="button"
                                        key={req.id}
                                        onClick={() => toggleRequirement(req.id)}
                                        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
                                    >
                                        <Badge variant={requirementIds.includes(req.id) ? "default" : "outline"}>{req.text}</Badge>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={!prompt.trim() || saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add question
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const CategoryColumn = ({ category, questions, requirementsById, requirements, kitId, onKitUpdate, disabled }) => {
    const [addOpen, setAddOpen] = useState(false)
    const [regenerating, setRegenerating] = useState(false)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))

    const handleUpdate = async (questionId, patch) => {
        try {
            const { data } = await api.put(`/kit/${kitId}/questions/${questionId}`, patch)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not save the question")
        }
    }

    const handleDelete = async (questionId) => {
        try {
            const { data } = await api.delete(`/kit/${kitId}/questions/${questionId}`)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not delete the question")
        }
    }

    const handleTogglePin = async (questionId) => {
        try {
            const { data } = await api.put(`/kit/${kitId}/questions/${questionId}/pin`)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not update pin")
        }
    }

    const handleMoveCategory = async (questionId, newCategory) => {
        try {
            const { data } = await api.put(`/kit/${kitId}/questions/${questionId}`, { category: newCategory })
            onKitUpdate(data)
            toast.success(`Moved to ${CATEGORIES.find((c) => c.value === newCategory)?.label}`)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not move the question")
        }
    }

    const handleCreate = async (payload) => {
        try {
            const { data } = await api.post(`/kit/${kitId}/questions`, payload)
            onKitUpdate(data)
            toast.success("Question added")
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not add the question")
            throw err
        }
    }

    const handleDragEnd = async (event) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = questions.findIndex((q) => q.id === active.id)
        const newIndex = questions.findIndex((q) => q.id === over.id)
        const reordered = arrayMove(questions, oldIndex, newIndex)
        try {
            const { data } = await api.put(`/kit/${kitId}/questions/reorder`, { orderedIds: reordered.map((q) => q.id) })
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not save the new order")
        }
    }

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const { data } = await api.post(`/kit/${kitId}/regenerate`, { section: "questions", category })
            onKitUpdate(data)
            toast.success("Category regenerated - pinned and edited questions were kept")
        } catch (err) {
            toast.error(err.response?.data?.message || "Regeneration failed")
        } finally {
            setRegenerating(false)
        }
    }

    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{questions.length} question(s)</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={disabled}>
                        <Plus className="h-4 w-4" /> Add
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={disabled || regenerating}>
                        {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Regenerate
                    </Button>
                </div>
            </div>

            {questions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    No questions in this category yet.
                </p>
            ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-3">
                            {questions.map((q) => (
                                <QuestionCard
                                    key={q.id}
                                    question={q}
                                    requirementsById={requirementsById}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    onTogglePin={handleTogglePin}
                                    onMoveCategory={handleMoveCategory}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            <AddQuestionDialog open={addOpen} onOpenChange={setAddOpen} category={category} requirements={requirements} onCreate={handleCreate} />
        </div>
    )
}

const QuestionsBoard = ({ kit, onKitUpdate, disabled }) => {
    const requirementsById = useMemo(() => new Map(kit.role.requirements.map((r) => [r.id, r])), [kit.role.requirements])
    const uncovered = kit.coverage?.uncovered_requirement_ids || []

    const byCategory = useMemo(() => {
        const grouped = { technical: [], behavioural: [], "system-design": [], "company-fit": [] }
        kit.questions.forEach((q) => { (grouped[q.category] ||= []).push(q) })
        return grouped
    }, [kit.questions])

    return (
        <div>
            {uncovered.length > 0 && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div>
                        <p className="font-medium">{uncovered.length} requirement(s) still have no question</p>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                            {uncovered.map((id) => (
                                <Badge key={id} variant="warning">{requirementsById.get(id)?.text || id}</Badge>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Tabs defaultValue="technical">
                <TabsList>
                    {CATEGORIES.map((c) => (
                        <TabsTrigger key={c.value} value={c.value}>
                            {c.label} ({byCategory[c.value]?.length || 0})
                        </TabsTrigger>
                    ))}
                </TabsList>
                {CATEGORIES.map((c) => (
                    <TabsContent key={c.value} value={c.value}>
                        <CategoryColumn
                            category={c.value}
                            questions={byCategory[c.value] || []}
                            requirementsById={requirementsById}
                            requirements={kit.role.requirements}
                            kitId={kit._id}
                            onKitUpdate={onKitUpdate}
                            disabled={disabled}
                        />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

export default QuestionsBoard
