import React, { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
    Loader2, Upload, FileJson, Sparkles, Globe, Wand2, Minus, Plus, X,
    Search, MessagesSquare, ListChecks, CalendarDays, Download, FileUp
} from "lucide-react"
import api from "../lib/axios.js"
import { Button } from "../components/ui/Button.jsx"
import { Input } from "../components/ui/Input.jsx"
import { Label } from "../components/ui/Label.jsx"
import { Textarea } from "../components/ui/Textarea.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs.jsx"
import { Badge } from "../components/ui/Badge.jsx"
import { cn } from "../lib/utils.js"
import { toast } from "sonner"

const EXAMPLE_JD = `Senior Backend Engineer - Payments Platform

We're looking for a Senior Backend Engineer to help build the next generation of our payments infrastructure.

Requirements:
- 5+ years of experience with Node.js and distributed systems is required
- Strong understanding of PostgreSQL and database performance tuning required
- Experience mentoring junior engineers is required
- Comfortable working directly with product and design to scope features

Bonus points for exposure to Kubernetes and experience with event-driven architectures.`

const DAY_PRESETS = [3, 5, 7, 14]

const PIPELINE_STEPS = [
    { Icon: Search, label: "Crawl the company site", desc: "Homepage, careers/hiring pages, ranked by relevance." },
    { Icon: MessagesSquare, label: "Search public discussion", desc: "What people say about the interview process." },
    { Icon: Sparkles, label: "Generate the kit", desc: "Brief, questions by category, and flashcards." },
    { Icon: ListChecks, label: "Check coverage", desc: "Every requirement gets at least one question." },
    { Icon: CalendarDays, label: "Build your schedule", desc: "Allocated across exactly the days you give it." }
]

const isLikelyUrl = (value) => /^https?:\/\/.+\..+/i.test(value.trim())

const DaysStepper = ({ value, onChange }) => {
    const set = (next) => onChange(Math.min(120, Math.max(1, next)))
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1">
                <Button type="button" variant="outline" size="icon" onClick={() => set(Number(value) - 1)} aria-label="Decrease days">
                    <Minus className="h-4 w-4" />
                </Button>
                <Input
                    id="days"
                    type="number"
                    min={1}
                    max={120}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    required
                />
                <Button type="button" variant="outline" size="icon" onClick={() => set(Number(value) + 1)} aria-label="Increase days">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
                {DAY_PRESETS.map((d) => (
                    <button
                        key={d}
                        type="button"
                        onClick={() => onChange(d)}
                        className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            Number(value) === d ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"
                        )}
                    >
                        {d}d
                    </button>
                ))}
            </div>
        </div>
    )
}

const SingleKitForm = () => {
    const [jd, setJd] = useState("")
    const [companyUrl, setCompanyUrl] = useState("")
    const [days, setDays] = useState(5)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const jdLength = jd.trim().length
    const jdIsThin = jdLength > 0 && jdLength < 100
    const urlTouched = companyUrl.length > 0
    const urlValid = isLikelyUrl(companyUrl)

    const fillExample = () => {
        setJd(EXAMPLE_JD)
        setCompanyUrl("https://gitlab.com")
        setDays(5)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError("")
        if (jd.trim().length === 0) return setError("Paste the job description first")
        if (companyUrl.trim().length === 0) return setError("Enter the company's website")

        setLoading(true)
        try {
            const { data } = await api.post("/kit", { jd, company_url: companyUrl, days: Number(days) })
            if (data.duplicate) toast.info("You already had a kit for this exact posting - opening it")
            navigate(`/kits/${data._id}`)
        } catch (err) {
            setError(err.response?.data?.message || "Could not start generation")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="jd">Job description</Label>
                    <button type="button" onClick={fillExample} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Wand2 className="h-3 w-3" /> Try an example
                    </button>
                </div>
                <Textarea
                    id="jd"
                    className="min-h-56"
                    placeholder="Paste the full job description here..."
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    required
                />
                <div className="flex items-center justify-between text-xs">
                    <span className={cn("text-muted-foreground", jdIsThin && "text-(--chart-warning)")}>
                        {jdLength.toLocaleString()} characters
                        {jdIsThin && " - a short posting is fine, but the kit will honestly reflect what's actually here"}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="company_url">Company website</Label>
                    <div className="relative">
                        <Globe className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="company_url"
                            placeholder="https://company.com"
                            value={companyUrl}
                            onChange={(e) => setCompanyUrl(e.target.value)}
                            className={cn("pl-9", urlTouched && !urlValid && "border-destructive focus-visible:ring-destructive")}
                            required
                        />
                    </div>
                    {urlTouched && !urlValid && <p className="text-xs text-destructive">Needs to look like a full URL, e.g. https://company.com</p>}
                    <p className="text-xs text-muted-foreground">We'll crawl this site for hiring pages and public info.</p>
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="days">Days until interview</Label>
                    <DaysStepper value={days} onChange={setDays} />
                </div>
            </div>

            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading} size="lg" className="self-start">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate kit
            </Button>
        </form>
    )
}

const downloadExampleBatch = () => {
    const example = [
        { id: "case-01", jd: "Backend Engineer. Node.js and PostgreSQL required. Mentoring required.", company_url: "https://gitlab.com", days: 5 },
        { id: "case-02", jd: "Frontend Engineer. React and TypeScript required.", company_url: "https://posthog.com", days: 7 }
    ]
    const blob = new Blob([JSON.stringify(example, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "interviewiq-batch-example.json"
    a.click()
    URL.revokeObjectURL(url)
}

const BatchKitForm = () => {
    const [items, setItems] = useState(null)
    const [fileName, setFileName] = useState("")
    const [parseError, setParseError] = useState("")
    const [loading, setLoading] = useState(false)
    const [dragActive, setDragActive] = useState(false)
    const fileInputRef = useRef(null)
    const navigate = useNavigate()

    const parseFile = async (file) => {
        setFileName(file.name)
        setParseError("")
        setItems(null)
        try {
            const text = await file.text()
            const parsed = JSON.parse(text)
            if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array")
            if (parsed.length === 0) throw new Error("File is empty")
            const invalid = parsed.findIndex((it) => !it.jd || !it.company_url)
            if (invalid !== -1) throw new Error(`Entry ${invalid + 1} is missing "jd" or "company_url"`)
            setItems(parsed)
        } catch (err) {
            setParseError(err.message || "Could not parse that file")
        }
    }

    const handleFileInput = (event) => {
        const file = event.target.files?.[0]
        if (file) parseFile(file)
    }

    const handleDrop = (event) => {
        event.preventDefault()
        setDragActive(false)
        const file = event.dataTransfer.files?.[0]
        if (file) parseFile(file)
    }

    const removeItem = (index) => {
        setItems((prev) => {
            const next = prev.filter((_, i) => i !== index)
            return next.length > 0 ? next : null
        })
    }

    const handleSubmit = async () => {
        if (!items || items.length === 0) return
        setLoading(true)
        try {
            await api.post("/kit/batch", { items })
            toast.success(`Started ${items.length} kit(s) - track progress on the dashboard`)
            navigate("/dashboard")
        } catch (err) {
            setParseError(err.response?.data?.message || "Could not start batch generation")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-5">
            <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={cn(
                    "rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                    dragActive ? "border-primary bg-accent" : "border-border"
                )}
            >
                <FileUp className={cn("mx-auto mb-2 h-8 w-8", dragActive ? "text-primary" : "text-muted-foreground")} />
                <p className="mb-1 text-sm text-muted-foreground">
                    Drag a JSON file here, or browse - an array of{" "}
                    <code className="rounded bg-muted px-1">{"{ jd, company_url, days }"}</code> objects.
                </p>
                <p className="mb-4 text-xs text-muted-foreground">Up to 20 roles per upload.</p>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileInput} className="hidden" id="batch-file" />
                <div className="flex flex-wrap items-center justify-center gap-3">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4" /> Choose file
                    </Button>
                    <button type="button" onClick={downloadExampleBatch} className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Download className="h-3 w-3" /> Download an example file
                    </button>
                </div>
            </div>

            {parseError && <p role="alert" className="text-sm text-destructive">{parseError}</p>}

            {items && items.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <p className="flex items-center gap-1.5 text-sm font-medium"><FileJson className="h-4 w-4" /> {fileName}</p>
                        <Badge variant="secondary">{items.length} role(s)</Badge>
                    </div>
                    <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                        {items.map((item, index) => (
                            <li key={item.id || index} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{item.company_url}</p>
                                    <p className="truncate text-xs text-muted-foreground">{item.jd.slice(0, 70)}{item.jd.length > 70 ? "..." : ""}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Badge variant="outline">{item.days || 5}d</Badge>
                                    <button type="button" onClick={() => removeItem(index)} aria-label="Remove entry" className="text-muted-foreground hover:text-destructive">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <Button onClick={handleSubmit} disabled={!items || loading} size="lg" className="self-start">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate {items?.length || ""} kit{items?.length === 1 ? "" : "s"}
            </Button>
        </div>
    )
}

const PipelineSidebar = () => (
    <Card className="lg:sticky lg:top-6">
        <CardHeader>
            <CardTitle className="text-base">What happens next</CardTitle>
            <CardDescription>Generation takes a minute or two and runs in the background.</CardDescription>
        </CardHeader>
        <CardContent>
            <ol className="flex flex-col gap-4">
                {PIPELINE_STEPS.map(({ Icon, label, desc }, index) => (
                    <li key={label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                                <Icon className="h-3.5 w-3.5" />
                            </span>
                            {index < PIPELINE_STEPS.length - 1 && <span className="mt-1 h-full w-px flex-1 bg-border" />}
                        </div>
                        <div className="pb-1">
                            <p className="text-sm font-medium leading-tight">{label}</p>
                            <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <p className="mt-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                A thin posting or a company with little public info still produces a kit - it'll just say so honestly instead of guessing.
            </p>
        </CardContent>
    </Card>
)

const NewKit = () => (
    <div className="mx-auto max-w-5xl">
        <div className="mb-6">
            <h1 className="flex items-center gap-2 text-2xl font-semibold"><Sparkles className="h-5 w-5 text-primary" /> Create a new prep kit</h1>
            <p className="text-sm text-muted-foreground">Paste a job description and a company URL, and we'll research and build the rest.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <Card>
                    <CardContent className="pt-6">
                        <Tabs defaultValue="single">
                            <TabsList>
                                <TabsTrigger value="single">Single role</TabsTrigger>
                                <TabsTrigger value="batch">Batch upload</TabsTrigger>
                            </TabsList>
                            <TabsContent value="single"><SingleKitForm /></TabsContent>
                            <TabsContent value="batch"><BatchKitForm /></TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
            <div><PipelineSidebar /></div>
        </div>
    </div>
)

export default NewKit
