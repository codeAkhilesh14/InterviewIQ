import { useEffect, useRef } from "react"
import api from "../lib/axios.js"

const POLL_INTERVAL_MS = 2500

// Polls a single kit while it's generating, so the UI can show live progress
// steps without a websocket - generation can legitimately take 60-90s (crawling +
// several LLM calls), so a spinner alone would be a bad experience (Section 12).
const useKitPolling = (kitId, status, onUpdate) => {
    const onUpdateRef = useRef(onUpdate)
    useEffect(() => { onUpdateRef.current = onUpdate }, [onUpdate])

    useEffect(() => {
        if (!kitId || (status !== "pending" && status !== "generating")) return

        let cancelled = false
        const interval = setInterval(async () => {
            try {
                const { data } = await api.get(`/kit/${kitId}`)
                if (cancelled) return
                onUpdateRef.current(data)
            } catch {
                // A transient failure to poll shouldn't stop the poll loop - the next
                // tick will just try again.
            }
        }, POLL_INTERVAL_MS)

        return () => {
            cancelled = true
            clearInterval(interval)
        }
    }, [kitId, status])
}

export default useKitPolling
