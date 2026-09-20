import React from "react"
import { useSelector } from "react-redux"
import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Loader2 } from "lucide-react"

// Guards every private route/endpoint on the client side (the real enforcement is
// the isAuth middleware on the server - this just avoids flashing protected UI).
// While authStatus is "idle" the very first getCurrentUser call hasn't resolved
// yet, so we show a loader instead of bouncing a logged-in user to /login on refresh.
const ProtectedRoute = () => {
    const { authStatus } = useSelector((state) => state.user)
    const location = useLocation()

    if (authStatus === "idle") {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
            </div>
        )
    }

    if (authStatus === "unauthenticated") {
        return <Navigate to="/login" replace state={{ from: location }} />
    }

    return <Outlet />
}

export default ProtectedRoute
