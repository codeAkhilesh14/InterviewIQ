import { createSlice } from "@reduxjs/toolkit"

const userSlice = createSlice({
    name: "user",
    initialState: {
        userData: null,
        // "idle" while the initial getCurrentUser check hasn't resolved yet - lets
        // ProtectedRoute avoid bouncing a logged-in user to /login on a page refresh.
        authStatus: "idle"
    },
    reducers: {
        setUserData: (state, action) => {
            state.userData = action.payload
            state.authStatus = action.payload ? "authenticated" : "unauthenticated"
        },
        clearUserData: (state) => {
            state.userData = null
            state.authStatus = "unauthenticated"
        }
    }
})

export const { setUserData, clearUserData } = userSlice.actions
export default userSlice.reducer
