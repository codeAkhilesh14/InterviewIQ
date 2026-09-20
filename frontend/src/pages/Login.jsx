import React, { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { Navigate } from "react-router-dom"
import { Sparkles, Loader2 } from "lucide-react"
import api from "../lib/axios.js"
import { setUserData } from "../redux/userSlice.js"
import { setTheme } from "../redux/themeSlice.js"
import { Button } from "../components/ui/Button.jsx"
import { Input } from "../components/ui/Input.jsx"
import { Label } from "../components/ui/Label.jsx"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/Card.jsx"
import { toast } from "sonner"

const Login = () => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const dispatch = useDispatch()
    const navigate = useNavigate()
    const location = useLocation()
    const authStatus = useSelector((state) => state.user.authStatus)

    if (authStatus === "authenticated") {
        return <Navigate to={location.state?.from?.pathname || "/dashboard"} replace />
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError("")
        setLoading(true)
        try {
            const { data } = await api.post("/auth/login", { email, password })
            dispatch(setUserData(data))
            if (data.theme) dispatch(setTheme(data.theme))
            toast.success(`Welcome back, ${data.name}`)
            navigate(location.state?.from?.pathname || "/dashboard", { replace: true })
        } catch (err) {
            setError(err.response?.data?.message || "Could not log in")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
            <Card className="w-full max-w-sm">
                <CardHeader className="items-center text-center">
                    <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-6 w-6 text-primary" />
                        <span className="text-xl font-semibold">InterviewIQ</span>
                    </div>
                    <CardTitle>Log in</CardTitle>
                    <CardDescription>Welcome back - pick up where you left off.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                        <Button type="submit" disabled={loading} className="mt-2">
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Log in
                        </Button>
                    </form>
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don't have an account?{" "}
                        <Link to="/register" className="font-medium text-primary hover:underline">Sign up</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}

export default Login
