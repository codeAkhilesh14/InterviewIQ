// Thin wrapper around the Groq chat-completions endpoint (OpenAI-compatible),
// with the two things a free-tier LLM pipeline cannot skip: a request queue that
// respects tokens-per-minute limits, and retry-with-backoff on 429 / transient
// failures (Section "Preferred Tech Stack": "a pipeline that falls over the first
// time a provider says 'slow down' is the most common way to lose points here").

const MIN_INTERVAL_MS = 1100 // spacing between calls, regardless of how many are queued
const MAX_RETRIES = 4
const REQUEST_TIMEOUT_MS = 45000

let queueTail = Promise.resolve()
let lastCallAt = 0

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Serializes all outbound LLM calls through a single queue so we never burst past
// the provider's tokens-per-minute window, no matter how many pipeline steps fire
// concurrently (e.g. generating questions for several requirements in parallel).
const enqueue = (task) => {
    const run = async () => {
        const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastCallAt))
        if (wait > 0) await sleep(wait)
        lastCallAt = Date.now()
        return task()
    }
    const result = queueTail.then(run, run)
    // Swallow so one failed call doesn't poison the queue for the next caller.
    queueTail = result.then(() => {}, () => {})
    return result
}

class LLMError extends Error {
    constructor(code, message) {
        super(message)
        this.code = code
    }
}

const callOnce = async ({ system, user, jsonMode, maxTokens, temperature }) => {
    const apiKey = process.env.GROQ_API_KEY
    const baseUrl = process.env.GROQ_API_BASE_URL || "https://api.groq.com/openai/v1"
    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"

    if (!apiKey) {
        throw new LLMError("MISSING_API_KEY", "GROQ_API_KEY is not configured")
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let res
    try {
        res = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: temperature ?? 0.4,
                max_tokens: maxTokens ?? 1600,
                // gpt-oss models on Groq spend part of max_tokens on hidden chain-of-thought
                // before the actual JSON content - "low" keeps that overhead small so more
                // of the budget goes to the answer itself, and it's simply ignored by
                // models that don't support it.
                reasoning_effort: "low",
                ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ]
            }),
            signal: controller.signal
        })
    } catch (error) {
        throw new LLMError(error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR", error.message)
    } finally {
        clearTimeout(timeout)
    }

    if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after"))
        throw Object.assign(new LLMError(res.status === 429 ? "RATE_LIMITED" : "SERVER_ERROR", `LLM provider returned ${res.status}`), {
            retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : null
        })
    }

    if (!res.ok) {
        const body = await res.text().catch(() => "")
        // Groq validates json_object responses server-side and can reject a call
        // outright (usually because the completion was cut off by max_tokens mid-JSON)
        // instead of returning malformed content for us to repair. Treat it as
        // retryable - a fresh sample, ideally with a higher token budget from the
        // caller, usually completes fine on the next attempt.
        if (res.status === 400 && /json_validate_failed/i.test(body)) {
            throw new LLMError("JSON_VALIDATION_FAILED", `LLM provider rejected the JSON output (likely truncated by max_tokens): ${body.slice(0, 200)}`)
        }
        throw new LLMError("REQUEST_FAILED", `LLM provider returned ${res.status}: ${body.slice(0, 300)}`)
    }

    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (typeof content !== "string" || content.trim().length === 0) {
        throw new LLMError("EMPTY_RESPONSE", "LLM returned an empty response")
    }
    return content
}

// Calls the model with retry+backoff on rate limits/transient errors. Callers get
// back either the raw text content or a thrown LLMError once retries are exhausted -
// pipeline steps decide how to degrade (skip a section, report a gap) from there.
export const callLLM = async (params) => enqueue(async () => {
    let attempt = 0
    let lastError

    while (attempt <= MAX_RETRIES) {
        try {
            return await callOnce(params)
        } catch (error) {
            lastError = error
            const retryable = error.code === "RATE_LIMITED" || error.code === "SERVER_ERROR" ||
                error.code === "TIMEOUT" || error.code === "NETWORK_ERROR" || error.code === "JSON_VALIDATION_FAILED"
            if (!retryable || attempt === MAX_RETRIES) break
            const backoff = error.retryAfterMs || (800 * 2 ** attempt + Math.random() * 400)
            await sleep(backoff)
            attempt += 1
        }
    }
    throw lastError
})

const stripCodeFence = (text) => text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "")

// Calls the model expecting JSON back, and if parsing fails, makes exactly one
// repair attempt (re-showing the model its own broken output) before giving up.
// This is the mitigation for Section 10's "the model returns invalid JSON".
export const callLLMJson = async ({ system, user, maxTokens, temperature }) => {
    const raw = await callLLM({ system, user, jsonMode: true, maxTokens, temperature })
    try {
        return JSON.parse(stripCodeFence(raw))
    } catch {
        try {
            const repaired = await callLLM({
                system: "You output only valid, complete JSON. No prose, no markdown fences.",
                user: `The following was supposed to be valid JSON but failed to parse. Return a corrected, complete, valid JSON version of it and nothing else:\n\n${raw}`,
                jsonMode: true,
                maxTokens,
                temperature: 0
            })
            return JSON.parse(stripCodeFence(repaired))
        } catch (error) {
            throw new LLMError("INVALID_JSON", `Model did not return valid JSON after a repair attempt: ${error.message}`)
        }
    }
}

export { LLMError }
