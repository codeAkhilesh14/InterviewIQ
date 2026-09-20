import React, { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { LayoutDashboard, FilePlus2, Settings, LogOut, Menu, X, Sparkles } from "lucide-react"
import { cn } from "../../lib/utils.js"
import api from "../../lib/axios.js"
import { clearUserData } from "../../redux/userSlice.js"
import ThemeToggle from "./ThemeToggle.jsx"
import { Button } from "../ui/Button.jsx"
import { toast } from "sonner"

const NAV_ITEMS = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/kits/new", label: "New Kit", icon: FilePlus2 },
    { to: "/settings", label: "Settings", icon: Settings }
]

const AppLayout = () => {
    const [mobileOpen, setMobileOpen] = useState(false)
    const userData = useSelector((state) => state.user.userData)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout")
        } catch {
            // even if the request fails, clear client state so the UI reflects signed-out
        }
        dispatch(clearUserData())
        toast.success("Logged out")
        navigate("/login")
    }

    const navLinkClass = ({ isActive }) =>
        cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )

    const SidebarContent = (
        <div className="flex h-full flex-col gap-6 p-4">
            <div className="flex items-center gap-2 px-2 pt-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">InterviewIQ</span>
            </div>
            <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className={navLinkClass} onClick={() => setMobileOpen(false)}>
                        <Icon className="h-4 w-4" />
                        {label}
                    </NavLink>
                ))}
            </nav>
            <div className="border-t border-border pt-4">
                <div className="mb-3 truncate px-2 text-xs text-muted-foreground">{userData?.email}</div>
                <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    Log out
                </Button>
            </div>
        </div>
    )

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
            {/* Desktop sidebar */}
            <aside className="hidden w-64 shrink-0 border-r border-border md:block">{SidebarContent}</aside>

            {/* Mobile sidebar (slide-over) */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
                    <aside className="absolute left-0 top-0 h-full w-64 bg-card shadow-xl">{SidebarContent}</aside>
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileOpen((v) => !v)}
                        aria-label={mobileOpen ? "Close menu" : "Open menu"}
                    >
                        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <div className="hidden md:block" />
                    <ThemeToggle />
                </header>
                <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default AppLayout
