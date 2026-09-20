import React from "react"
import { Sun, Moon } from "lucide-react"
import useTheme from "../../hooks/useTheme.js"
import { Button } from "../ui/Button.jsx"

const ThemeToggle = () => {
    const { theme, toggle } = useTheme()
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
    )
}

export default ThemeToggle
