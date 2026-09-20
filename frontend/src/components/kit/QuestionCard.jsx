import React, { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Trash2, Pin, ChevronDown, User } from "lucide-react"
import { Badge } from "../ui/Badge.jsx"
import { Button } from "../ui/Button.jsx"
import { Textarea } from "../ui/Textarea.jsx"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../ui/Select.jsx"
import { cn } from "../../lib/utils.js"
import useDebouncedCallback from "../../hooks/useDebouncedCallback.js"

const CATEGORY_LABEL = { technical: "Technical", behavioural: "Behavioural", "system-design": "System Design", "company-fit": "Company Fit" }
const DIFFICULTY_LABEL = { 1: "Easy", 2: "Medium", 3: "Hard" }

const QuestionCard = ({ question, requirementsById, onUpdate, onDelete, onTogglePin, onMoveCategory }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id })
    const [prompt, setPrompt] = useState(question.prompt)
    const [answerOutline, setAnswerOutline] = useState(question.answer_outline)
    const [showAnswer, setShowAnswer] = useState(false)

    const persist = useDebouncedCallback((patch) => onUpdate(question.id, patch), 700)

    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
    const isUserAdded = question.meta?.origin === "user"
    const isEdited = question.meta?.edited

    return (
        <div ref={setNodeRef} style={style} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-start gap-2">
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                    aria-label="Drag to reorder"
                >
                    <GripVertical className="h-4 w-4" />
                </button>
                <div className="flex-1">
                    <Textarea
                        value={prompt}
                        onChange={(e) => { setPrompt(e.target.value); persist({ prompt: e.target.value }) }}
                        className="min-h-16 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                </div>
            </div>

            <div className="mb-2 flex flex-wrap items-center gap-1.5 pl-6">
                <Badge variant="outline">{DIFFICULTY_LABEL[question.difficulty]}</Badge>
                {question.requirement_ids.map((id) => (
                    <Badge key={id} variant="secondary" className="max-w-40 truncate" title={requirementsById.get(id)?.text}>
                        {requirementsById.get(id)?.text || id}
                    </Badge>
                ))}
                {isUserAdded && <Badge variant="outline"><User className="mr-1 h-3 w-3" />Added by you</Badge>}
                {isEdited && !isUserAdded && <Badge variant="outline">Edited</Badge>}
            </div>

            <button
                onClick={() => setShowAnswer((v) => !v)}
                className="mb-2 flex items-center gap-1 pl-6 text-xs text-muted-foreground hover:text-foreground"
            >
                <ChevronDown className={cn("h-3 w-3 transition-transform", showAnswer && "rotate-180")} />
                {showAnswer ? "Hide" : "Show"} answer outline
            </button>
            {showAnswer && (
                <Textarea
                    value={answerOutline}
                    onChange={(e) => { setAnswerOutline(e.target.value); persist({ answer_outline: e.target.value }) }}
                    className="mb-2 ml-6 min-h-16 text-sm"
                    placeholder="Answer outline..."
                />
            )}

            <div className="flex items-center justify-between pl-6 pt-1">
                <Select value={question.category} onValueChange={(value) => onMoveCategory(question.id, value)}>
                    <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(CATEGORY_LABEL).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={question.meta?.pinned ? "Unpin question" : "Pin question (protects it from regeneration)"}
                        onClick={() => onTogglePin(question.id)}
                        className={cn(question.meta?.pinned && "text-primary")}
                    >
                        <Pin className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete question" onClick={() => onDelete(question.id)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default QuestionCard
