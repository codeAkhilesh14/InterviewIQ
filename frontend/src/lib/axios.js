import axios from "axios"
import { store } from "../redux/store.js"
import { clearUserData } from "../redux/userSlice.js"

export const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000"

const api = axios.create({
    baseURL: `${serverUrl}/api`,
    withCredentials: true
})

// A 401 on any authenticated call means the session expired or was invalidated
// server-side - drop the client's user state so ProtectedRoute sends the user back
// to /login instead of leaving them looking at a page full of failed requests
// (Section 1: "sensible handling of expired or invalid sessions").
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && store.getState().user.authStatus === "authenticated") {
            store.dispatch(clearUserData())
        }
        return Promise.reject(error)
    }
)

export default api
