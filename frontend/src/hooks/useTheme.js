import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { toggleTheme as toggleThemeAction } from "../redux/themeSlice.js"
import api from "../lib/axios.js"

// Applies the current theme to <html class="dark"> so Tailwind's `dark:` variant
// (configured via @custom-variant in index.css) takes effect, and persists a
// logged-in user's preference server-side so it follows them across devices.
const useTheme = () => {
    const theme = useSelector((state) => state.theme.value)
    const userData = useSelector((state) => state.user.userData)
    const dispatch = useDispatch()

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
    }, [theme])

    const toggle = () => {
        dispatch(toggleThemeAction())
        if (userData) {
            const next = theme === "dark" ? "light" : "dark"
            api.put("/user/profile", { theme: next }).catch(() => {})
        }
    }

    return { theme, toggle }
}

export default useTheme
