import React, { useState } from "react"
import { Link } from "react-router-dom"
import { MoreVertical, Trash2, Calendar, Building2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/DropdownMenu.jsx"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/Dialog.jsx"
import { Button } from "../ui/Button.jsx"
import StatusBadge from "./StatusBadge.jsx"

const KitCard = ({ kit, onDelete }) => {
    const [confirmOpen, setConfirmOpen] = useState(false)
    const isOpenable = kit.status !== "pending"

    return (
        <Card className="flex flex-col transition-shadow hover:shadow-md">
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0">
                    <CardTitle className="truncate text-base">{kit.source?.role || "Untitled role"}</CardTitle>
                    <div className="mt-1 flex items-center gap-1 truncate text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{kit.source?.company || kit.input?.company_url}</span>
                    </div>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="Kit options">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setConfirmOpen(true)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {kit.input?.days_requested} day plan
                    </span>
                    <StatusBadge status={kit.status} />
                </div>
                {kit.status === "failed" && (
                    <p className="line-clamp-2 text-xs text-destructive">{kit.error?.message}</p>
                )}
                <Button asChild variant="outline" className="w-full" disabled={!isOpenable}>
                    <Link to={`/kits/${kit._id}`}>{kit.status === "failed" ? "View details" : "Open kit"}</Link>
                </Button>
            </CardContent>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete this kit?</DialogTitle>
                        <DialogDescription>
                            This permanently deletes "{kit.source?.role || "this kit"}" and everything in it. This can't be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                        <Button variant="destructive" onClick={() => { onDelete(kit._id); setConfirmOpen(false) }}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    )
}

export default KitCard
