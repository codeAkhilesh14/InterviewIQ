import React, { useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Loader2 } from "lucide-react"
import api from "../lib/axios.js"
import { setUserData } from "../redux/userSlice.js"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import { Button } from "../components/ui/Button.jsx"
import { Input } from "../components/ui/Input.jsx"
import { Label } from "../components/ui/Label.jsx"
import { toast } from "sonner"

const ProfileCard = () => {
    const userData = useSelector((state) => state.user.userData)
    const dispatch = useDispatch()
    const [name, setName] = useState(userData?.name || "")
    const [saving, setSaving] = useState(false)

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
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your name and email.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label>Email</Label>
                        <Input value={userData?.email || ""} disabled />
                    </div>
                    <Button type="submit" disabled={saving} className="self-start">
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

const PasswordCard = () => {
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState("")

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
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your account password.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="current-password">Current password</Label>
                        <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label htmlFor="new-password">New password</Label>
                        <Input id="new-password" type="password" autoComplete="new-password" minLength={6} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
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

const Settings = () => (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <ProfileCard />
        <PasswordCard />
    </div>
)

export default Settings
