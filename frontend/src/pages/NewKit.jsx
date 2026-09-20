import React, { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Loader2, Upload, FileJson } from "lucide-react"
import api from "../lib/axios.js"
import { Button } from "../components/ui/Button.jsx"
import { Input } from "../components/ui/Input.jsx"
import { Label } from "../components/ui/Label.jsx"
import { Textarea } from "../components/ui/Textarea.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs.jsx"
import { toast } from "sonner"

const SingleKitForm = () => {
    const [jd, setJd] = useState("")
    const [companyUrl, setCompanyUrl] = useState("")
    const [days, setDays] = useState(5)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

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
                <Label htmlFor="jd">Job description</Label>
                <Textarea
                    id="jd"
                    className="min-h-56"
                    placeholder="Paste the full job description here..."
                    value={jd}
                    onChange={(e) => setJd(e.target.value)}
                    required
                />
                <p className="text-xs text-muted-foreground">{jd.length.toLocaleString()} characters</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-2 sm:col-span-2">
                    <Label htmlFor="company_url">Company website</Label>
                    <Input id="company_url" placeholder="https://company.com" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="days">Days until interview</Label>
                    <Input id="days" type="number" min={1} max={120} value={days} onChange={(e) => setDays(e.target.value)} required />
                </div>
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={loading} className="self-start">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate kit
            </Button>
        </form>
    )
}

const BatchKitForm = () => {
    const [items, setItems] = useState(null)
    const [fileName, setFileName] = useState("")
    const [parseError, setParseError] = useState("")
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef(null)
    const navigate = useNavigate()

    const handleFile = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setParseError("")
        setItems(null)
        try {
            const text = await file.text()
            const parsed = JSON.parse(text)
            if (!Array.isArray(parsed)) throw new Error("File must contain a JSON array")
            const invalid = parsed.findIndex((it) => !it.jd || !it.company_url)
            if (invalid !== -1) throw new Error(`Entry ${invalid + 1} is missing "jd" or "company_url"`)
            setItems(parsed)
        } catch (err) {
            setParseError(err.message || "Could not parse that file")
        }
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
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <FileJson className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="mb-1 text-sm text-muted-foreground">
                    Upload a JSON file: an array of <code className="rounded bg-muted px-1">{"{ jd, company_url, days }"}</code> objects.
                </p>
                <p className="mb-4 text-xs text-muted-foreground">Up to 20 roles per upload.</p>
                <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFile} className="hidden" id="batch-file" />
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Choose file
                </Button>
                {fileName && <p className="mt-3 text-sm">{fileName} - {items ? `${items.length} role(s) found` : "parsing..."}</p>}
            </div>
            {parseError && <p role="alert" className="text-sm text-destructive">{parseError}</p>}
            <Button onClick={handleSubmit} disabled={!items || loading} className="self-start">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Generate {items?.length || ""} kit(s)
            </Button>
        </div>
    )
}

const NewKit = () => (
    <div className="mx-auto max-w-2xl">
        <Card>
            <CardHeader>
                <CardTitle>Create a new prep kit</CardTitle>
                <CardDescription>Generation runs in the background - you can watch it progress on the next page.</CardDescription>
            </CardHeader>
            <CardContent>
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
)

export default NewKit
