import { useEffect, useRef, useCallback } from "react"

// Lets an input update local/UI state immediately on every keystroke while the
// actual network write is delayed and coalesced - this is what makes inline
// editing "feel immediate rather than round-tripping for every keystroke"
// (Section 12) without spamming the API on every character.
const useDebouncedCallback = (callback, delayMs = 600) => {
    const callbackRef = useRef(callback)
    const timeoutRef = useRef(null)

    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    useEffect(() => () => clearTimeout(timeoutRef.current), [])

    return useCallback((...args) => {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = setTimeout(() => callbackRef.current(...args), delayMs)
    }, [delayMs])
}

export default useDebouncedCallback
