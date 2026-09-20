import React, { useMemo } from "react"
import { ListChecks, BookOpen, CalendarDays, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card.jsx"
import Meter from "../charts/Meter.jsx"
import DonutChart from "../charts/DonutChart.jsx"
import SimpleBarChart from "../charts/SimpleBarChart.jsx"

const CATEGORY_META = {
    technical: { label: "Technical", color: "var(--chart-1)" },
    behavioural: { label: "Behavioural", color: "var(--chart-2)" },
    "system-design": { label: "System Design", color: "var(--chart-3)" },
    "company-fit": { label: "Company Fit", color: "var(--chart-4)" }
}

const StatTile = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent">
            <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
            <p className="text-lg font-semibold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    </div>
)

const KitOverview = ({ kit }) => {
    const requirements = kit.role.requirements
    const mustCount = requirements.filter((r) => r.priority === "must").length
    const coveredCount = requirements.length - (kit.coverage?.uncovered_requirement_ids?.length || 0)
    const coveragePct = requirements.length > 0 ? (coveredCount / requirements.length) * 100 : 100
    const coverageTone = coveragePct >= 90 ? "good" : coveragePct >= 60 ? "warning" : "critical"

    const categoryData = useMemo(() => {
        const counts = {}
        kit.questions.forEach((q) => { counts[q.category] = (counts[q.category] || 0) + 1 })
        return Object.entries(counts)
            .filter(([, value]) => value > 0)
            .map(([key, value]) => ({ name: CATEGORY_META[key]?.label || key, value, color: CATEGORY_META[key]?.color || "var(--chart-1)" }))
    }, [kit.questions])

    const scheduleData = useMemo(
        () => kit.schedule.days.map((d) => ({ day: `Day ${d.day}`, minutes: d.minutes })),
        [kit.schedule.days]
    )

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon={Target} label="Requirements" value={requirements.length} />
                <StatTile icon={ListChecks} label="Questions" value={kit.questions.length} />
                <StatTile icon={BookOpen} label="Flashcards" value={kit.flashcards.length} />
                <StatTile icon={CalendarDays} label="Day plan" value={kit.schedule.days_available} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Requirement coverage</CardTitle>
                    <CardDescription>Every question's requirement_ids checked against the extracted requirement list.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                    <Meter label="Covered" value={coveredCount} max={requirements.length} tone={coverageTone} suffix="requirements" />
                    <p className="text-xs text-muted-foreground">
                        {mustCount} of {requirements.length} requirements are must-have · {kit.coverage?.passes || 1} generation pass(es) run
                    </p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Question bank composition</CardTitle>
                        <CardDescription>Where your practice time is concentrated.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <DonutChart data={categoryData} centerValue={kit.questions.length} centerLabel="questions" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Time per day</CardTitle>
                        <CardDescription>Harder, higher-priority material lands earlier.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SimpleBarChart data={scheduleData} xKey="day" yKey="minutes" valueSuffix="min" height={200} />
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default KitOverview
