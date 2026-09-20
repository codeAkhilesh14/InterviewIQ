import { configureStore } from "@reduxjs/toolkit"
import userReducer from "./userSlice.js"
import kitReducer from "./kitSlice.js"
import themeReducer from "./themeSlice.js"

export const store = configureStore({
    reducer: {
        user: userReducer,
        kit: kitReducer,
        theme: themeReducer
    }
})
