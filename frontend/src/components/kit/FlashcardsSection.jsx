import React, { useState } from "react"
import { Plus, RefreshCw, Loader2, Trash2, User } from "lucide-react"
import { Button } from "../ui/Button.jsx"
import { Badge } from "../ui/Badge.jsx"
import { Textarea } from "../ui/Textarea.jsx"
import { Label } from "../ui/Label.jsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/Dialog.jsx"
import useDebouncedCallback from "../../hooks/useDebouncedCallback.js"
import api from "../../lib/axios.js"
import { toast } from "sonner"

const FlashcardEditor = ({ card, kitId, onKitUpdate }) => {
    const [front, setFront] = useState(card.front)
    const [back, setBack] = useState(card.back)

    const persist = useDebouncedCallback(async (patch) => {
        try {
            const { data } = await api.put(`/kit/${kitId}/flashcards/${card.id}`, patch)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not save the flashcard")
        }
    }, 700)

    const handleDelete = async () => {
        try {
            const { data } = await api.delete(`/kit/${kitId}/flashcards/${card.id}`)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not delete the flashcard")
        }
    }

    return (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
            <Textarea
                value={front}
                onChange={(e) => { setFront(e.target.value); persist({ front: e.target.value, back }) }}
                className="min-h-14 text-sm font-medium"
                placeholder="Front"
            />
            <Textarea
                value={back}
                onChange={(e) => { setBack(e.target.value); persist({ front, back: e.target.value }) }}
                className="min-h-16 text-sm text-muted-foreground"
                placeholder="Back"
            />
            <div className="flex items-center justify-between">
                {card.meta?.origin === "user" ? <Badge variant="outline"><User className="mr-1 h-3 w-3" />Added by you</Badge> : <span />}
                <Button variant="ghost" size="icon" aria-label="Delete flashcard" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}

const AddFlashcardDialog = ({ open, onOpenChange, kitId, onKitUpdate }) => {
    const [front, setFront] = useState("")
    const [back, setBack] = useState("")
    const [saving, setSaving] = useState(false)

    const handleCreate = async () => {
        if (!front.trim() || !back.trim()) return
        setSaving(true)
        try {
            const { data } = await api.post(`/kit/${kitId}/flashcards`, { front, back })
            onKitUpdate(data)
            setFront(""); setBack("")
            onOpenChange(false)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not add the flashcard")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add a flashcard</DialogTitle>
                    <DialogDescription>Hand-added flashcards always survive a regeneration.</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label>Front</Label>
                        <Textarea value={front} onChange={(e) => setFront(e.target.value)} autoFocus />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Back</Label>
                        <Textarea value={back} onChange={(e) => setBack(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleCreate} disabled={!front.trim() || !back.trim() || saving}>
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Add flashcard
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const FlashcardsSection = ({ kit, onKitUpdate, disabled }) => {
    const [addOpen, setAddOpen] = useState(false)
    const [regenerating, setRegenerating] = useState(false)

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const { data } = await api.post(`/kit/${kit._id}/regenerate`, { section: "flashcards" })
            onKitUpdate(data)
            toast.success("Flashcards regenerated - your own cards were kept")
        } catch (err) {
            toast.error(err.response?.data?.message || "Regeneration failed")
        } finally {
            setRegenerating(false)
        }
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{kit.flashcards.length} flashcard(s)</p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setAddOpen(true)} disabled={disabled}><Plus className="h-4 w-4" /> Add</Button>
                    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={disabled || regenerating}>
                        {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Regenerate
                    </Button>
                </div>
            </div>
            {kit.flashcards.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No flashcards yet.</p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {kit.flashcards.map((card) => <FlashcardEditor key={card.id} card={card} kitId={kit._id} onKitUpdate={onKitUpdate} />)}
                </div>
            )}
            <AddFlashcardDialog open={addOpen} onOpenChange={setAddOpen} kitId={kit._id} onKitUpdate={onKitUpdate} />
        </div>
    )
}

export default FlashcardsSection
