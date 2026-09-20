import React from "react"
import { Link } from "react-router-dom"
import { Button } from "../components/ui/Button.jsx"

const NotFound = () => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background text-center text-foreground">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">This page doesn't exist.</p>
        <Button asChild><Link to="/">Go home</Link></Button>
    </div>
)

export default NotFound
