import React from "react"
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { cn } from "../../lib/utils.js"

// A single ratio against a limit is a meter, not a 2-slice donut (dataviz skill:
// "choosing-a-form" - stat tile / meter beats a pie of 2 slices every time).
// tone drives the fill color AND ships with an icon + label per slot, since a
// status color is never allowed to carry meaning by hue alone.
const TONE_CONFIG = {
    good: { color: "var(--chart-good)", Icon: CheckCircle2 },
    warning: { color: "var(--chart-warning)", Icon: AlertTriangle },
    critical: { color: "var(--chart-critical)", Icon: XCircle },
    primary: { color: "var(--primary)", Icon: null }
}

const Meter = ({ label, value, max, tone = "primary", suffix, asPercent = false, className }) => {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
    const { color, Icon } = TONE_CONFIG[tone] || TONE_CONFIG.primary

    return (
        <div className={cn("flex flex-col gap-1.5", className)}>
            <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                    {Icon && <Icon className="h-4 w-4" style={{ color }} />}
                    {label}
                </span>
                <span className="text-muted-foreground">
                    {asPercent ? `${pct}%` : `${value}/${max} ${suffix || ""} · ${pct}%`}
                </span>
            </div>
            <div
                className="h-2.5 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--chart-track)" }}
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={label}
            >
                <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    )
}

export default Meter
