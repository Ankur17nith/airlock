# Task queue

Ordered by demo risk. Each task names its files and what "done" means. Tick when `npm run check` (typecheck + lint + tests) is green and the commit is pushed. Steps only a human can do (Firebase console, recording, submitting) are in `docs/human-runbook.md`.

## T1: Foundations (Wed 26)
- [x] Brand: logo, mark, favicon (`brand/`)
- [x] Design system (`docs/DESIGN.md`)
- [x] Plan, licence (Apache-2.0), gitignore
- [ ] Docs set: TASKS, STATUS, QUESTIONS, runbook, architecture, privacy, business case, demo script, submission
- [ ] `web/` Vite + React 19 + TypeScript, `motion`, Vitest; tokens in `web/src/theme.css`; fonts
- [ ] Landing page in the hex.tech style: hero, chips, the boundary diagram, how it works, numbers, FAQ, footer

## T2: The airlock core (Thu 27). Must ship
- [ ] `web/src/airlock/types.ts`: `Identity`, `LineItem`, `SealedBill`, `Finding`, `Letter`, `LedgerEntry`
- [ ] `web/src/airlock/vault.ts`: token map, `seal(identity) → tokens`, `rehydrate(text)`, AES-GCM in IndexedDB with a session key; tests
- [ ] `web/src/airlock/sweep.ts`: regex sweep (phones, emails, SSN-like, long digit runs, dates, ZIP+street lines) over line-item text; tests
- [ ] `web/src/airlock/guard.ts`: normalised-variant leak check over the serialised payload; unit tests and property tests (fast-check)
- [ ] `web/src/airlock/ledger.ts`: append-only boundary ledger (what, when, bytes, source, verdict)
- [ ] `web/src/ai/firebase.ts`: app, App Check, anonymous Auth, Remote Config defaults, AI Logic instance
- [ ] `web/src/ai/stages.ts`: `read` (ONLY_ON_DEVICE, image + JSON schema), `audit` (ONLY_IN_CLOUD + googleSearch), `explain` (PREFER_ON_DEVICE); each returns `{ data, inferenceSource }`
- [ ] `web/src/ai/schemas.ts`: response schemas shared by the prompts and tests
- [ ] Fictional sample bills (`web/public/samples/`): ER visit with a duplicate charge; an EOB with an out-of-network denial that the No Surprises Act may cover

## T3: The product flow (Fri 28)
- [ ] `/app` route: Upload → Read (Nano progress, download state) → Seal (animated redaction) → Review crossing → Audit → Findings → Letter → Print/PDF → Report the outcome
- [ ] Boundary panel component, always visible on desktop
- [ ] Inference badges read from `inferenceSource`
- [ ] Manual airlock: canvas black-box redaction + "send exactly this" approval when Nano is unavailable
- [ ] Inline cell correction for misread line items
- [ ] Error, offline and empty states

## T4: Firebase services and deploy (Sat 29)
- [ ] Firestore `outcomes/{type}` counters + `firestore.rules` (increment-only) + rules tests in the emulator
- [ ] Remote Config template (`remoteconfig.template.json`) and runtime reads
- [ ] App Check with reCAPTCHA Enterprise; debug-token path for judges
- [ ] `?replay=1`: recorded real session on a fictional bill, labelled "replay"
- [ ] `firebase.json` hosting; `npm run deploy`
- [ ] Lighthouse ≥ 90 on landing (performance, accessibility)

## T5: Story (Sun 30)
- [ ] Screen recordings (scripted in `docs/demo-script.md`)
- [ ] ElevenLabs voiceover, two voices (American and Indian English); low music bed; mix at −16 LUFS with music −24 dB under speech
- [ ] Film ≤ 2:45 rendered in `video/`, YouTube public, English captions
- [ ] Deck (PDF), README GIFs, submission text (`docs/submission.md`)
- [ ] Repo public; licence visible in About; topics set
