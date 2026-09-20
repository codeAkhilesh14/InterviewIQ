import React, { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Loader2, Eye, EyeOff, Sun, Moon, Check, ShieldCheck, User as UserIcon, Lock, Palette } from "lucide-react"
import api from "../lib/axios.js"
import { setUserData } from "../redux/userSlice.js"
import { setTheme } from "../redux/themeSlice.js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import { Button } from "../components/ui/Button.jsx"
import { Input } from "../components/ui/Input.jsx"
import { Label } from "../components/ui/Label.jsx"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/Tabs.jsx"
import { cn } from "../lib/utils.js"
import { toast } from "sonner"

const getInitials = (name) => (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

const formatMemberSince = (isoDate) => {
    if (!isoDate) return null
    try {
        return new Date(isoDate).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    } catch {
        return null
    }
}

const ProfileHeader = () => {
    const userData = useSelector((state) => state.user.userData)
    const memberSince = formatMemberSince(userData?.createdAt)

    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
                {getInitials(userData?.name)}
            </div>
            <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{userData?.name}</p>
                <p className="truncate text-sm text-muted-foreground">{userData?.email}</p>
                {memberSince && <p className="mt-0.5 text-xs text-muted-foreground">Member since {memberSince}</p>}
            </div>
        </div>
    )
}

const ProfileSection = () => {
    const userData = useSelector((state) => state.user.userData)
    const dispatch = useDispatch()
    const [name, setName] = useState(userData?.name || "")
    const [saving, setSaving] = useState(false)

    const dirty = name.trim() !== (userData?.name || "") && name.trim().length > 0

    const handleSave = async (event) => {
        event.preventDefault()
        setSaving(true)
        try {
            const { data } = await api.put("/user/profile", { name })
            dispatch(setUserData(data))
            toast.success("Profile updated")
        } catch (err) {
            toast.error(err.response?.data?.message || "Could not update profile")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><UserIcon className="h-4 w-4 text-primary" /> Profile</CardTitle>
                <CardDescription>Your display name and account email.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label className="flex items-center gap-1.5">Email <Lock className="h-3 w-3 text-muted-foreground" /></Label>
                        <Input value={userData?.email || ""} disabled />
                        <p className="text-xs text-muted-foreground">Email can't be changed.</p>
                    </div>
                    <Button type="submit" disabled={saving || !dirty} className="self-start">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Save changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

const PasswordInput = ({ id, value, onChange, autoComplete, placeholder }) => {
    const [visible, setVisible] = useState(false)
    return (
        <div className="relative">
            <Input
                id={id}
                type={visible ? "text" : "password"}
                autoComplete={autoComplete}
                minLength={6}
                required
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="pr-10"
            />
            <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                aria-label={visible ? "Hide password" : "Show password"}
            >
                {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
        </div>
    )
}

const SecuritySection = () => {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

    const strength = newPassword.length === 0 ? null : newPassword.length < 6 ? "weak" : newPassword.length < 10 ? "okay" : "strong"
    const strengthMeta = {
        weak: { label: "Too short", color: "var(--chart-critical)", width: "33%" },
        okay: { label: "Okay", color: "var(--chart-warning)", width: "66%" },
        strong: { label: "Strong", color: "var(--chart-good)", width: "100%" }
    }

    const handleSave = async (event) => {
        event.preventDefault()
        setError("")
        if (newPassword.length < 6) return setError("New password must be at least 6 characters")
        setSaving(true)
        try {
            await api.put("/user/password", { currentPassword, newPassword })
            toast.success("Password updated")
            setCurrentPassword(""); setNewPassword("")
        } catch (err) {
            setError(err.response?.data?.message || "Could not update password")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" /> Password</CardTitle>
                <CardDescription>Choose a new password for your account.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="current-password">Current password</Label>
                        <PasswordInput id="current-password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="new-password">New password</Label>
                        <PasswordInput id="new-password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
                        {strength && (
                            <div className="flex items-center gap-2">
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full transition-all" style={{ width: strengthMeta[strength].width, backgroundColor: strengthMeta[strength].color }} />
                                </div>
                                <span className="text-xs" style={{ color: strengthMeta[strength].color }}>{strengthMeta[strength].label}</span>
                            </div>
                        )}
                    </div>
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" disabled={saving} className="self-start">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Update password
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

const AppearanceSection = () => {
    const theme = useSelector((state) => state.theme.value)
    const userData = useSelector((state) => state.user.userData)
    const dispatch = useDispatch()

    const choose = (next) => {
        if (next === theme) return
        dispatch(setTheme(next))
        if (userData) api.put("/user/profile", { theme: next }).catch(() => {})
    }

    const OPTIONS = [
        { value: "light", label: "Light", Icon: Sun, preview: "bg-white border-zinc-200" },
        { value: "dark", label: "Dark", Icon: Moon, preview: "bg-zinc-900 border-zinc-700" }
    ]

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><Palette className="h-4 w-4 text-primary" /> Appearance</CardTitle>
                <CardDescription>Choose how InterviewIQ looks on this device.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
                    {OPTIONS.map(({ value, label, Icon, preview }) => (
                        <button
                            key={value}
                            onClick={() => choose(value)}
                            className={cn(
                                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                theme === value ? "border-primary" : "border-border hover:border-muted-foreground"
                            )}
                        >
                            <div className={cn("relative flex h-14 w-full items-center justify-center rounded-lg border", preview)}>
                                <Icon className={cn("h-5 w-5", value === "dark" ? "text-white" : "text-zinc-800")} />
                                {theme === value && (
                                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                        <Check className="h-3 w-3" />
                                    </span>
                                )}
                            </div>
                            <span className="text-sm font-medium">{label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}

const Settings = () => (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your profile, security and appearance.</p>
        </div>

        <ProfileHeader />

        <Tabs defaultValue="profile">
            <TabsList>
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </TabsList>
            <TabsContent value="profile"><ProfileSection /></TabsContent>
            <TabsContent value="security"><SecuritySection /></TabsContent>
            <TabsContent value="appearance"><AppearanceSection /></TabsContent>
        </Tabs>
    </div>
)

export default Settings
