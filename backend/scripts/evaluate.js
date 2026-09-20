#!/usr/bin/env node
// Batch entry point required by Section 9 of the brief:
//   npm run evaluate -- --input <cases.json> --output <kits.json>
//
// Deliberately does NOT touch MongoDB - it calls the exact same runPipeline()
// function the HTTP API uses (Section 9: "the same code your application uses, not
// a parallel implementation"), and only needs an LLM key to run, so it works from a
// clean clone with nothing but `npm install` and a .env.
import dotenv from "dotenv"
import fs from "node:fs/promises"
import path from "node:path"
import { runPipeline } from "../services/pipeline/runPipeline.js"

dotenv.config()

const parseArgs = (argv) => {
    const args = {}
    for (let i = 0; i < argv.length; i += 1) {
        const token = argv[i]
        if (!token.startsWith("--")) continue
        const key = token.slice(2)
        const next = argv[i + 1]
        if (next && !next.startsWith("--")) {
            args[key] = next
            i += 1
        } else {
            args[key] = true
        }
    }
    return args
}

// Cases are I/O-bound (crawling) more than CPU-bound, so a small concurrency lets
// several cases' network fetches overlap while every case still shares the same
// process-wide LLM request queue (services/llm/client.js) - so we never burst past
// the provider's tokens-per-minute limit no matter how many cases run at once.
const CONCURRENCY = 3

const runWithConcurrency = async (items, limit, worker) => {
    const results = new Array(items.length)
    let cursor = 0
    const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (cursor < items.length) {
            const index = cursor
            cursor += 1
            results[index] = await worker(items[index], index)
        }
    })
    await Promise.all(runners)
    return results
}

const runCase = async (testCase) => {
    const id = testCase?.id ?? "unknown"
    try {
        if (!testCase || typeof testCase.jd !== "string" || typeof testCase.company_url !== "string") {
            throw Object.assign(new Error("Case is missing required fields (id, jd, company_url, days)"), { code: "INVALID_CASE" })
        }
        const days = Number.isFinite(Number(testCase.days)) ? Number(testCase.days) : 5
        const { kit } = await runPipeline({ jd: testCase.jd, companyUrl: testCase.company_url, days })
        return { id, status: "ok", kit, error: null }
    } catch (error) {
        return {
            id,
            status: "failed",
            kit: null,
            error: { code: error.code || "UNKNOWN_ERROR", message: error.message || String(error) }
        }
    }
}

const main = async () => {
    const args = parseArgs(process.argv.slice(2))
    if (!args.input || !args.output) {
        console.error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>")
        process.exit(1)
    }

    const inputPath = path.resolve(process.cwd(), args.input)
    const outputPath = path.resolve(process.cwd(), args.output)

    let cases
    try {
        const raw = await fs.readFile(inputPath, "utf-8")
        cases = JSON.parse(raw)
        if (!Array.isArray(cases)) throw new Error("Input file must contain a JSON array of cases")
    } catch (error) {
        console.error(`Failed to read input file: ${error.message}`)
        process.exit(1)
    }

    console.log(`Running ${cases.length} case(s) with concurrency ${CONCURRENCY}...`)
    const startedAt = Date.now()

    const kits = await runWithConcurrency(cases, CONCURRENCY, async (testCase) => {
        const result = await runCase(testCase)
        const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
        console.log(`[${elapsed}s] case ${result.id}: ${result.status}${result.error ? ` (${result.error.code})` : ""}`)
        return result
    })

    const output = {
        version: "1.0",
        generated_at: new Date().toISOString(),
        kits
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), "utf-8")

    const okCount = kits.filter((k) => k.status === "ok").length
    console.log(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s - ${okCount}/${kits.length} ok. Written to ${outputPath}`)
}

main().catch((error) => {
    console.error("Fatal error running batch evaluation:", error)
    process.exit(1)
})
