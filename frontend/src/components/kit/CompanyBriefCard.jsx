import React, { useState } from "react"
import { RefreshCw, Loader2, ExternalLink } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/Card.jsx"
import { Textarea } from "../ui/Textarea.jsx"
import { Button } from "../ui/Button.jsx"
import { Badge } from "../ui/Badge.jsx"
import useDebouncedCallback from "../../hooks/useDebouncedCallback.js"
import api from "../../lib/axios.js"
import { toast } from "sonner"

const CompanyBriefCard = ({ kit, onKitUpdate, disabled }) => {
    const [summary, setSummary] = useState(kit.company_brief.summary)
    const [whatTheyDo, setWhatTheyDo] = useState(kit.company_brief.what_they_do)
    const [saving, setSaving] = useState(false)
    const [regenerating, setRegenerating] = useState(false)

    const persist = useDebouncedCallback(async (patch) => {
        setSaving(true)
        try {
            const { data } = await api.put(`/kit/${kit._id}/company-brief`, patch)
            onKitUpdate(data)
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not save the brief")
        } finally {
            setSaving(false)
        }
    }, 700)

    const handleRegenerate = async () => {
        setRegenerating(true)
        try {
            const { data } = await api.post(`/kit/${kit._id}/regenerate`, { section: "company_brief" })
            onKitUpdate(data)
            setSummary(data.company_brief.summary)
            setWhatTheyDo(data.company_brief.what_they_do)
            toast.success("Company brief regenerated")
        } catch (err) {
            toast.error(err.response?.data?.message || "Regeneration failed")
        } finally {
            setRegenerating(false)
        }
    }

    const noSources = !kit.company_brief.sources || kit.company_brief.sources.length === 0

    return (
        <Card>
            <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                    <CardTitle>Company brief</CardTitle>
                    <CardDescription>
                        {noSources ? "No company pages could be retrieved - this brief is unverified." : `Based on ${kit.company_brief.sources.length} page(s) retrieved from the company site.`}
                    </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={disabled || regenerating}>
                    {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Regenerate
                </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Summary</label>
                    <Textarea
                        value={summary}
                        disabled={disabled}
                        onChange={(e) => { setSummary(e.target.value); persist({ summary: e.target.value, what_they_do: whatTheyDo }) }}
                        className="min-h-20"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">What they do</label>
                    <Textarea
                        value={whatTheyDo}
                        disabled={disabled}
                        onChange={(e) => { setWhatTheyDo(e.target.value); persist({ summary, what_they_do: e.target.value }) }}
                        className="min-h-20"
                    />
                </div>
                {saving && <p className="text-xs text-muted-foreground">Saving...</p>}

                <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-sm font-medium">Interview process</p>
                    <p className="text-sm text-muted-foreground">{kit.interview_process?.notes}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                        {kit.interview_process?.signals?.systemDesign && <Badge variant="secondary">System design round</Badge>}
                        {kit.interview_process?.signals?.takeHome && <Badge variant="secondary">Take-home</Badge>}
                        {kit.interview_process?.signals?.onsite && <Badge variant="secondary">On-site/panel</Badge>}
                        {kit.interview_process?.signals?.behavioural && <Badge variant="secondary">Behavioural round</Badge>}
                    </div>
                </div>

                {kit.source?.pages_used?.length > 0 && (
                    <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Sources used</p>
                        <ul className="flex flex-col gap-1">
                            {kit.source.pages_used.map((url) => (
                                <li key={url}>
                                    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                                        <ExternalLink className="h-3 w-3" /> {url}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default CompanyBriefCard
