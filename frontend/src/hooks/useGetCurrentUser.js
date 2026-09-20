import { useEffect } from "react"
import { useDispatch } from "react-redux"
import api from "../lib/axios.js"
import { setUserData } from "../redux/userSlice.js"
import { setTheme } from "../redux/themeSlice.js"

// Runs once at app start to find out whether the httpOnly session cookie still
// represents a valid, logged-in user - a 401 here just means "signed out", not
// an application error, so it resolves quietly either way.
const useGetCurrentUser = () => {
    const dispatch = useDispatch()

    useEffect(() => {
        let cancelled = false

        const fetchCurrentUser = async () => {
            try {
                const { data } = await api.get("/user/current")
                if (cancelled) return
                dispatch(setUserData(data))
                if (data.theme) dispatch(setTheme(data.theme))
            } catch {
                if (!cancelled) dispatch(setUserData(null))
            }
        }

        fetchCurrentUser()
        return () => { cancelled = true }
    }, [dispatch])
}

export default useGetCurrentUser
