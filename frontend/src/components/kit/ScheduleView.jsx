import React, { useMemo, useState } from "react"
import { RefreshCw, Loader2, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card.jsx"
import { Badge } from "../ui/Badge.jsx"
import { Button } from "../ui/Button.jsx"
import SimpleBarChart from "../charts/SimpleBarChart.jsx"
import api from "../../lib/axios.js"
import { toast } from "sonner"

const ScheduleView = ({ kit, onKitUpdate, disabled }) => {
    const [regenerating, setRegenerating] = useState(false)
    const questionsById = useMemo(() => new Map(kit.questions.map((q) => [q.id, q])), [kit.questions])

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const { data } = await api.post(`/kit/${kit._id}/regenerate`, { section: "schedule" })
            onKitUpdate(data)
            toast.success("Schedule rebuilt from the current question set")
        } catch (err) {
            toast.error(err.response?.data?.message || "Regeneration failed")
        } finally {
            setRegenerating(false)
        }
    }

    return (
        <div>
            <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {kit.schedule.days_available} day plan - allocated automatically from priority and difficulty.
                </p>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={disabled || regenerating}>
                    {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rebuild
                </Button>
            </div>

            <Card className="mb-4">
                <CardContent className="pt-5">
                    <SimpleBarChart data={kit.schedule.days.map((d) => ({ day: `Day ${d.day}`, minutes: d.minutes }))} xKey="day" yKey="minutes" valueSuffix="min" height={180} />
                </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
                {kit.schedule.days.map((day) => (
                    <Card key={day.day}>
                        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base">Day {day.day} · {day.focus}</CardTitle>
                            <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />{day.minutes} min</Badge>
                        </CardHeader>
                        <CardContent>
                            {day.question_ids.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No material scheduled for this day.</p>
                            ) : (
                                <ul className="flex flex-col gap-1.5">
                                    {day.question_ids.map((qid) => {
                                        const question = questionsById.get(qid)
                                        return (
                                            <li key={qid} className="text-sm">
                                                <span className="text-muted-foreground">[{question?.category || "?"}]</span> {question?.prompt || qid}
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default ScheduleView
