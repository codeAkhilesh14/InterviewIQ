# InterviewIQ — AI Interview Prep Kit

Turns a pasted job description + a company URL into a structured, editable
interview prep kit: a company brief, a role breakdown, a categorised question
bank, flashcards, and a day-by-day study schedule — researched, generated,
cross-checked and scheduled by a real multi-step pipeline, not a single prompt.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 (Vite) + Tailwind CSS v4 | Chosen over Next.js — this is a client-rendered SPA behind auth with no SEO/SSR need, so Vite gives a much faster dev loop for the same result. Hand-built shadcn-style primitives (Radix + `class-variance-authority` + `tailwind-merge`) instead of the shadcn CLI, since the CLI needs an interactive `init` step. |
| State | Redux Toolkit (`user`, `kit`, `theme` slices) | |
| Backend | Node.js + Express, ESM (`"type": "module"`) | |
| Database | MongoDB (Atlas) + Mongoose | |
| LLM | **Groq** — `openai/gpt-oss-120b`, OpenAI-compatible endpoint | Genuine free tier, generous tokens/minute. `reasoning_effort: "low"` is set on every call — gpt-oss is a reasoning model and its hidden chain-of-thought otherwise eats into `max_tokens` and truncates JSON output (see Known limitations). |
| Auth | Email + password, JWT in an httpOnly cookie, bcrypt hashing | No OAuth, no email verification/reset — explicitly out of scope per the brief. |
| Scraping | `cheerio` + native `fetch`, hand-rolled crawler | No headless browser — company marketing/careers pages are server-rendered HTML almost universally, and a real browser would blow the time/rate budget for no benefit here. |

## Repository layout

```
InterviewIQ/
  backend/    Express API, retrieval, LLM pipeline, batch CLI, tests
  frontend/   React app (builder UI, practice mode, auth)
```

## Setup — local

**Backend**
```bash
cd backend
npm install
cp .env.example .env      # fill in MONGODB_URL, JWT_SECRET, GROQ_API_KEY
npm run dev                # http://localhost:8000
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env       # VITE_SERVER_URL=http://localhost:8000
npm run dev                 # http://localhost:5173
```

**Batch entry point** (Section 9 — must work from a clean clone, no DB needed):
```bash
cd backend
npm install
cp .env.example .env       # only GROQ_API_KEY is required for this command
npm run evaluate -- --input cases.json --output kits.json
```
`cases.json` is the array described in Appendix B. `company_url` may point at
a locally-served fixture (e.g. `http://localhost:8099/acme/`) — set
`ALLOW_PRIVATE_HOSTS=true` in `.env` for that case, since the SSRF guard
otherwise refuses loopback/private hosts by default even outside production.
Five cases complete in well under 15 minutes — three test cases (one real
site, one thin JD, one unreachable domain) completed in ~15 seconds total in
local testing.

### Environment variables

| Var | Used by | Purpose |
|---|---|---|
| `PORT` | backend | HTTP port (default 8000) |
| `NODE_ENV` | backend | `production` enables secure cookies and always rejects private/loopback URLs |
| `FRONTEND_URL` | backend | CORS allow-origin |
| `MONGODB_URL` | backend (API only, not `evaluate`) | Mongo Atlas connection string |
| `JWT_SECRET` | backend | Session token signing |
| `GROQ_API_KEY` | backend | Groq API key (**required**, incl. for `npm run evaluate`) |
| `GROQ_API_BASE_URL` | backend | Defaults to `https://api.groq.com/openai/v1` |
| `GROQ_MODEL` | backend | Defaults to `openai/gpt-oss-120b` |
| `CRAWLER_USER_AGENT` | backend | Sent on every crawl request |
| `ALLOW_PRIVATE_HOSTS` | backend | Dev/test-only escape hatch for the SSRF guard (ignored when `NODE_ENV=production`) |
| `VITE_SERVER_URL` | frontend | Backend base URL |

## Architecture

```
Browser (React/Redux)
   │  cookie-based session
   ▼
Express API ── controllers/ (auth, user, kit)
   │
   ├─ services/retrieval/   urlSafety, robots, fetchPage, htmlClean, crawler, publicDiscussion
   ├─ services/llm/         client (queue + backoff), promptSafety
   ├─ services/pipeline/    runPipeline (orchestrator) + one file per step
   └─ models/               User, Kit (Mongoose)

scripts/evaluate.js  ──calls the same runPipeline()── same code path as the API
```

`runPipeline()` in `backend/services/pipeline/runPipeline.js` is the single
source of truth: both the HTTP API (`kit.controller.js`) and the batch CLI
(`scripts/evaluate.js`) call it directly — Section 9 requires this explicitly,
and it's also just correct: two implementations of "turn a JD into a kit"
would drift.

## Retrieval approach

- **Crawling** (`services/retrieval/crawler.js`): best-first search starting
  at the homepage. Every outbound link is scored (`linkScoring.js`) against
  keyword signals — `careers`, `hiring`, `handbook`, `life-at`, `about`,
  `interview-process`, etc. — with a small negative weight for `login`,
  `pricing`, `terms`. The crawler always fetches the highest-scoring
  unvisited link next, up to 2 levels deep and 6 pages, so it finds a hiring
  page nested under `/careers`, or published as `/handbook` (GitLab/PostHog's
  actual pattern), without any path being hard-coded.
- **Public discussion**: DuckDuckGo's `lite.duckduckgo.com` HTML endpoint
  (no API key, server-rendered, parseable with `cheerio`) searched for
  `"<company> interview process questions"`. Best-effort — a failed or empty
  search is recorded and the kit says so honestly, never fabricated.
- **Safety**: every fetch goes through `assertSafeUrl` (rejects
  non-http(s), resolves DNS and blocks private/loopback ranges — always in
  production, opt-in-only in dev for the batch fixture case), `robots.txt`
  compliance, a per-host rate limit (min. spacing between requests to the same
  host), a 2MB size cap, and a content-type allowlist. A page that fails any
  of these is skipped and recorded, never fatal to the run.
- **Prompt-injection defence**: every piece of untrusted text (the JD, every
  crawled page) is wrapped by `services/llm/promptSafety.js` in an explicit
  fence with an instruction that its contents are data, not instructions —
  used consistently across every LLM call, since both the JD and every
  crawled page are attacker-controllable text handed to a model.

## Sequencing (Section 3)

`runPipeline()` runs these steps in order, each responding to what the
previous ones actually found:

1. **Extract requirements** from the pasted JD — no retrieval needed, so this
   runs first and needs nothing else.
2. **Crawl the company site** — a homepage needs crawling before it's useful.
3. **Search public discussion** of the interview process (independent of the
   company's own site).
4. **Summarise interview-process signals** (`interviewProcess.js`) — keyword
   detection (system design / take-home / on-site / behavioural) runs in
   code, deterministically, over whatever was found; an LLM call then writes
   a short honest summary (or says nothing was found). These signals feed
   step 6: a company that surfaces "system design" gets system-design
   questions generated regardless of seniority; one that surfaces nothing
   doesn't get a fabricated interview-process claim.
5. **Company brief** — generated only from what was actually crawled; zero
   pages in means an explicit "could not be generated from source material"
   summary, never an invented one.
6. **Generate questions per requirement *kind***, one LLM call per kind with
   different instructions — `technical` → hands-on/practical questions,
   `behavioural` → STAR-style questions, `domain` → company-fit questions.
   A 5-years-React requirement and a mentors-junior-engineers requirement
   never share a call. System-design questions are added on top when the
   interview-process signals or seniority call for it.
7. **Flashcards** generated from the same requirement list.
8. **Coverage check** (deterministic, `coverage.js`) — a requirement is
   uncovered if no question's `requirement_ids` includes it.
9. **Second pass** (Section 4) — see below.
10. **Schedule** built deterministically (`scheduler.js`) from the final
    question set.
11. **Structure validation** (`validateKit.js`, Zod + referential-integrity
    checks) before anything is saved or returned.

Two steps are explicitly *not* handed to the model, per the brief: **coverage
checking** and **schedule allocation** are both plain code.

## The second pass

After the first draft, `checkCoverage` returns every uncovered requirement
id. The loop then:
1. Splits gaps into must/nice (`splitGapsByPriority`), must-haves first.
2. Regenerates questions **only for the still-uncovered requirements**,
   grouped by kind (so the same per-kind prompt separation applies).
3. Re-checks coverage.
4. Repeats up to **3 total passes** (1 initial + 2 gap-filling), then stops
   and reports whatever remains in `coverage.uncovered_requirement_ids`
   honestly rather than looping indefinitely against a provider that may
   simply not be able to produce a question for a vague/unusual requirement.
   Three was chosen because after two genuine retries against the same
   requirement text, a third is very unlikely to succeed where the first two
   didn't — the marginal value drops fast while the LLM-call cost doesn't.

## State model — generated / edited / pinned

Every question, flashcard, the company brief, and the schedule carries a
`meta: { origin, edited, pinned }` (`origin: "generated" | "user"`). This is
what makes "regenerate one section without losing edits made elsewhere" and
"a hand-edited question must survive a regeneration of its category" both
mechanical rather than fuzzy:

- **`origin: "user"`** — added by the person, always survives regeneration.
- **`edited: true`** — set automatically the first time a generated item is
  changed through the builder; also always survives.
- **`pinned: true`** — explicit opt-in via the pin icon; same guarantee, for
  a generated item the user wants to keep as-is without having "edited" it.

`services/pipeline/regenerate.js` implements this: regenerating a question
category keeps every item where `isProtected(meta)` is true, computes which
requirements are *still* covered by the kept items, and only asks the model
for fresh questions covering what's left — so it doesn't blindly duplicate
coverage a kept question already provides. Regenerating the schedule needs no
LLM call at all — it's pure re-allocation over the current question set.
Regenerating the company brief re-crawls (state isn't cached long-term to
avoid storing large page blobs) and fully overwrites the brief, since there's
no per-field granularity to preserve there — the frontend is expected to
treat that action as a deliberate overwrite.

## Schedule allocation (Section 8)

Pure arithmetic in `services/pipeline/scheduler.js`, no model involved:

1. Every generated question gets an estimated duration from its difficulty
   (`{1: 15, 2: 25, 3: 40}` minutes — deliberately coarse, integers only).
2. Questions are sorted by (a) whether they cover a **must**-priority
   requirement, (b) difficulty, (c) category — so the hardest, highest-value
   material sorts first.
3. If there are **at least as many questions as days requested**: split the
   sorted list into contiguous chunks, one per day, with day 1 (not the last
   day) absorbing any remainder — front-loading, not "the night before".
4. If there are **fewer questions than days** (a thin JD with a long runway,
   or the 60-day edge case): each item gets its own day first in priority
   order, then remaining days cycle back over the same material as
   half-length "review" days, so every requested day still has real content
   and the day count still matches exactly what was asked for.
5. A 1-day request gets everything in one day, however much that adds up to
   — correctness (every must-have's question is included) outweighs
   realism for a deliberately extreme input.

This also satisfies "allocates all of it" (every generated question ends up
scheduled somewhere) and "every must-have requirement appears somewhere in
the schedule" as a direct consequence, not a separate check.

## Practice mode ordering

Confidence-weighted, not full spaced-repetition: cards never practised sort
first (the biggest unknown), then by lowest most-recent confidence, then by
recency as a tiebreak so nothing repeats twice in a row. A proper SM-2-style
interval was considered and rejected for this scope — it needs a review-date
model the brief doesn't ask for, and confidence-weighting already directly
implements "order the next session by what they were least confident about"
without inventing scheduling semantics the person never asked for.

## Edge cases (Section 10)

| Case | Behaviour |
|---|---|
| Invalid/404/timeout company URL | Crawl step fails safely, recorded as a skipped source; kit still generates with an honest "could not be retrieved" brief. Verified via `case-03-unreachable` in local batch testing — `status: "ok"`, `pages_used: []`, an honest brief, full requirement extraction from the JD alone. |
| No discoverable hiring/about page | Best-first crawl simply doesn't find one; `interview_process.notes` says so plainly instead of guessing. |
| Two-line JD stub | `extractRequirements` returns however few requirements are actually implied — verified in testing: a 2-sentence JD produced exactly 1 requirement, no invented title/seniority/responsibilities. |
| No public discussion found | Recorded as a skipped source (`NO_RESULTS`), never fabricated. |
| Model returns invalid JSON | One repair round-trip (re-shown its own broken output); Groq's own `json_validate_failed` (usually a `max_tokens` truncation) is treated as retryable with a fresh sample. |
| Provider rate-limits / briefly fails | All LLM calls go through one process-wide queue with fixed spacing plus exponential backoff + jitter on 429/5xx/timeout, up to 4 retries. |
| Same JD + company submitted twice | `createKit` looks for an existing kit with identical `(owner, jd, company_url)` and returns it instead of re-running generation, unless it previously failed (then it retries in place). |
| 1-day / 60-day schedule | See scheduler section above; both covered by unit tests. |

## Testing

`cd backend && npm test` (Vitest) — covers the three behaviours the brief
calls out explicitly as worth protecting: **schedule allocation**,
**coverage checking**, and **structure validation** (including referential
integrity: unknown requirement/question ids, duplicate ids, non-integer
minutes, a schedule day count that doesn't match `days_available`).

## Known limitations / trade-offs

- **No creative feature was built.** The brief marks it optional and the
  4-day window (2-3 days of intended work) went entirely to the required
  scope — research/generation pipeline, the coverage loop, the builder's
  edit/pin state model, and practice mode all needed to be solid first.
- **Groq's gpt-oss models spend part of every response's token budget on
  hidden reasoning.** `reasoning_effort: "low"` and generous `max_tokens`
  mitigate this, but a very large JD with many requirements could still hit
  truncation on the first attempt before the retry succeeds.
- **DuckDuckGo's HTML markup is not a stable API** — the public-discussion
  search is inherently best-effort and will degrade gracefully (reported as
  a skipped source) if DuckDuckGo changes its markup.
- **No websocket for generation progress** — the frontend polls
  `GET /api/kit/:id` every 2.5s while a kit is generating. Simpler and more
  robust across free-tier hosts than a persistent connection, at the cost of
  progress updates being slightly less instant.
- **Company-brief regeneration re-crawls** rather than reusing cached page
  text, to avoid persisting large HTML blobs per kit — slightly slower, but
  keeps document size bounded.
