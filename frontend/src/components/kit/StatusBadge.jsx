import React from "react"
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Badge } from "../ui/Badge.jsx"

const STATUS_CONFIG = {
    pending: { label: "Queued", variant: "outline", icon: Clock },
    generating: { label: "Generating", variant: "warning", icon: Loader2, spin: true },
    ready: { label: "Ready", variant: "success", icon: CheckCircle2 },
    failed: { label: "Failed", variant: "destructive", icon: XCircle }
}

const StatusBadge = ({ status, className }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
    const Icon = config.icon
    return (
        <Badge variant={config.variant} className={className}>
            <Icon className={`mr-1 h-3 w-3 ${config.spin ? "animate-spin" : ""}`} />
            {config.label}
        </Badge>
    )
}

export default StatusBadge
