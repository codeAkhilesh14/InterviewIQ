import { createSlice } from "@reduxjs/toolkit"

const getInitialTheme = () => {
    try {
        const stored = localStorage.getItem("theme")
        if (stored === "light" || stored === "dark") return stored
    } catch {
        // localStorage can throw in private browsing - fall back silently
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const themeSlice = createSlice({
    name: "theme",
    initialState: {
        value: getInitialTheme()
    },
    reducers: {
        setTheme: (state, action) => {
            state.value = action.payload
            try {
                localStorage.setItem("theme", action.payload)
            } catch {
                // ignore
            }
        },
        toggleTheme: (state) => {
            state.value = state.value === "dark" ? "light" : "dark"
            try {
                localStorage.setItem("theme", state.value)
            } catch {
                // ignore
            }
        }
    }
})

export const { setTheme, toggleTheme } = themeSlice.actions
export default themeSlice.reducer
