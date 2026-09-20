import React from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Toaster } from "sonner"
import { useSelector } from "react-redux"
import useGetCurrentUser from "./hooks/useGetCurrentUser.js"
import useTheme from "./hooks/useTheme.js"
import ProtectedRoute from "./components/layout/ProtectedRoute.jsx"
import AppLayout from "./components/layout/AppLayout.jsx"
import Landing from "./pages/Landing.jsx"
import Login from "./pages/Login.jsx"
import Register from "./pages/Register.jsx"
import Dashboard from "./pages/Dashboard.jsx"
import NewKit from "./pages/NewKit.jsx"
import KitView from "./pages/KitView.jsx"
import Practice from "./pages/Practice.jsx"
import Settings from "./pages/Settings.jsx"
import NotFound from "./pages/NotFound.jsx"

const App = () => {
    useGetCurrentUser()
    useTheme()
    const theme = useSelector((state) => state.theme.value)

    return (
        <BrowserRouter>
            <Toaster richColors position="top-right" theme={theme} />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/kits/new" element={<NewKit />} />
                        <Route path="/kits/:id" element={<KitView />} />
                        <Route path="/kits/:id/practice" element={<Practice />} />
                        <Route path="/settings" element={<Settings />} />
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
