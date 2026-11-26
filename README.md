<p align="center"><img src="brand/airlock-logo.svg" alt="Airlock" height="64"></p>

<h3 align="center">Fight the bill, not your privacy.</h3>

<p align="center">Airlock audits your medical bill and writes the dispute letter.<br/>Gemini Nano reads your bill on your laptop; only anonymous line items ever reach the cloud.</p>

<p align="center">
<a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-1D1726" alt="Apache-2.0"></a>
<img src="https://img.shields.io/badge/Firebase%20AI%20Logic-hybrid-E5484D" alt="Firebase AI Logic hybrid">
<img src="https://img.shields.io/badge/Gemini%20Nano-on%20device-21918C" alt="Gemini Nano on device">
<img src="https://img.shields.io/badge/%23BuildHybridAI-2026-1D1726" alt="#BuildHybridAI 2026">
</p>

**Live:** *coming Sat 29 Nov* · **Film (2:45):** *Sun 30 Nov* · **Architecture:** [docs/architecture.md](docs/architecture.md) · **Privacy model:** [docs/privacy.md](docs/privacy.md) · **Business case:** [docs/business-case.md](docs/business-case.md)

---

43% of American adults have received a medical bill they believed was wrong. Fewer than half of insured people ever challenge one, and those who do get it cut 38% of the time ([sources](docs/business-case.md)). The step in between is reading codes, knowing the rules and writing a letter. Language models are good at all three, but asking one today means pasting your name, birthday, insurance ID and diagnosis into a chatbot.

**Airlock splits the work across a wall.**

| On your device | Crosses the wall | In the cloud |
|---|---|---|
| **Gemini Nano reads the bill** (`ONLY_ON_DEVICE`: it can never fall back to the cloud) | Anonymous line items: codes, units, amounts, day offsets | **Gemini audits the charges** (`ONLY_IN_CLOUD` + Google Search grounding) |
| Your identity is sealed in an encrypted vault and replaced with tokens | …checked byte by byte by a **deterministic guard** that blocks any leak | …and drafts the dispute letter with placeholders |
| **The letter is filled back in** with your real details, locally | | |
| **Explanations** run `PREFER_ON_DEVICE`: offline when they can be | | |

> ### Judge this in 90 seconds
>
> 1. **No setup:** open the live URL with `?replay=1`. A recorded real run on a fictional bill plays through every stage, labelled *replay*.
> 2. **With Gemini Nano:** Chrome 139+ → `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → Enabled → relaunch. Open the app, press **Prepare on-device model**, then **Check a sample bill**. Watch the badge: **● ON DEVICE** for Read, **● IN CLOUD** for Audit.
> 3. **Try to break it:** add `?guard-demo=1`. An ID is smuggled into a line description; the guard blocks the request and the boundary panel shows a red **BLOCKED** row.
> 4. **Check it yourself:** DevTools → Network → the Gemini request. Search it for *Ellison*. It isn't there.

## How it uses Firebase

| Product | Job in Airlock |
|---|---|
| **Firebase AI Logic** | One SDK, three inference modes (`ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`, `PREFER_ON_DEVICE`), each chosen for the data it handles; `inferenceSource` shown on every output |
| **App Check** | reCAPTCHA Enterprise in front of AI Logic |
| **Authentication** | Anonymous sign-in for Firestore |
| **Remote Config** | Cloud model name, redaction strictness and policy switches without a redeploy |
| **Firestore** | Anonymous outcome counters: disputed / won / lost per finding type |
| **Hosting** | The app, behind a strict Content Security Policy |

## Run it locally

```bash
cd web
cp .env.example .env.local     # Firebase web config, see docs/human-runbook.md
npm ci
npm run dev                    # http://localhost:5173
npm run check                  # typecheck + lint + tests
```

## Repository

```
brand/     logo, mark, favicon
docs/      plan, architecture, privacy, business case, design system, demo script, runbook
web/       the app (Vite + React + TypeScript)
video/     the demo film: script, voiceover, render pipeline
```

## Licence

[Apache-2.0](LICENSE). Sample bills are fictional; any resemblance to a real person is accidental.
