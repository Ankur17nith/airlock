# Airlock: the execution plan (#BuildHybridAI 2026)

**Deadline:** 1 Dec 2026, 03:30 IST (30 Nov 22:00 UTC). **Today:** 26 Nov, 14:00 IST. **Budget:** ~4 days, one human plus agents.
**Platform entered:** Web (Chrome desktop, Gemini Nano via the Prompt API), through Firebase AI Logic hybrid inference. Android is a stretch goal (section 10).

---

## 1. The idea

**Name:** Airlock.

**Tagline:** *Fight the bill, not your privacy.*

**One line:** Airlock reads a medical bill on your laptop, seals your identity on the device, sends only anonymous line items to the cloud for an audit, and writes the dispute letter with your details filled back in locally.

**The hook:** It's the first bill-fighting tool where the model that knows your name and the model that knows billing rules never see the same document. On-device Gemini Nano holds the identity. Cloud Gemini holds the expertise. A wall in code sits between them, and the user watches every item that crosses it.

**30-second pitch:** 43% of American adults have received a medical bill they believed was wrong ([KFF Health Care Debt Survey, 2022](https://www.kff.org/policy-watch/could-consumer-assistance-be-helpful-to-people-facing-medical-debt/)). Fewer than half of insured people challenge one, mostly because they don't know they can ([Commonwealth Fund, 2024](https://commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf)). Those who do get the bill cut or cancelled 38% of the time. The missing step is a letter. Today, getting an AI to write it means pasting your diagnosis, your insurer ID and your home address into a chatbot. Airlock does it without that: Gemini Nano reads the bill on your laptop and swaps every identifier for a token. Cloud Gemini audits the anonymous charges against billing rules and drafts the appeal. Your name goes back into the letter on your machine. You can turn on airplane mode and the private half still works.

**Who it's for:**
- **Primary:** an insured US adult holding a confusing hospital bill or a claim denial (EOB) who won't paste their medical record into a chatbot.
- **Secondary:**
  - Caregivers who handle a parent's bills.
  - Patient advocates and nonprofit billing counsellors, who handle other people's records and are bound by HIPAA-style confidentiality.
  - Indian families dealing with hospital bills and cashless-claim (TPA) rejections, the same shape of problem.

**Why now:**
1. Chrome ships Gemini Nano with image input and structured JSON output, so a laptop can read a bill privately.
2. Firebase AI Logic puts that model and cloud Gemini behind one SDK. `InferenceMode.ONLY_ON_DEVICE` gives a hard guarantee (no silent cloud fallback), and every response reports `inferenceSource`.
3. Cloud Gemini can ground on Google Search for current billing rules (CPT bundling, No Surprises Act, appeal deadlines).

## 2. What is new (honest table)

Everything here is new: the repository was created on 26 Nov 2026, inside the submission period.

| Area | What we build |
|---|---|
| Hybrid pipeline | Four stages (Read, Seal, Audit, Write) and a fifth that runs on demand (Explain). Each stage's inference mode is chosen on purpose and enforced in code (section 4) |
| The airlock guard | A deterministic function that inspects every outbound cloud payload and refuses to send it if any sealed value (or a normalised variant of one) is present. Unit-tested and property-tested |
| Vault | Identifier → token map, kept in IndexedDB on the device, encrypted with a per-session WebCrypto key; never synced |
| Manual airlock | For devices without Nano: the user paints black boxes over the bill (canvas redaction) and approves the exact payload before it crosses |
| Boundary panel | A live ledger of every byte that crossed, with its inference source and the guard's verdict |
| Community outcomes | Anonymous Firestore counters (finding type → disputed / won / lost), no free text, no amounts tied to a person |
| Policy | Remote Config: redaction strictness, cloud model name, whether the manual airlock is allowed, audit prompt version |
| Security | App Check (reCAPTCHA Enterprise; debug token for judges), anonymous Auth, Firestore rules that allow only counter increments |
| Replay mode | `?replay=1` plays a recorded real session on a fictional bill, labelled *replay*, so judges without Nano can see the whole flow |
| Landing + app UI | A hex.tech-inspired design system (`docs/DESIGN.md`) |

## 3. Winning strategy for each judging criterion

| Criterion | What scores it |
|---|---|
| **Technological implementation** ("how effectively does it use hybrid inference") | Each stage uses a *different* inference mode for a stated reason: `ONLY_ON_DEVICE` for anything that touches identity, `ONLY_IN_CLOUD` + Google Search grounding for the audit, `PREFER_ON_DEVICE` for explanations. The guard is code with tests, not prompt text. The UI shows the real `inferenceSource` of every output. App Check, Auth, Remote Config and Firestore are all used, each for a real job |
| **Design** ("complete product, not a proof of concept") | Landing page → upload → watch the seal → findings → letter → print/PDF → report the outcome. Empty, loading, error, offline and no-Nano states all designed. Dark mode. Mobile layout |
| **Potential impact** ("credible, specific case for a real audience") | Sourced numbers (KFF, Commonwealth Fund, JAMA Health Forum) in `docs/business-case.md`. One named persona with one real-shaped bill. The outcome counter turns usage into evidence |
| **Quality of the idea** ("creative, non-obvious use; understanding of the problem") | The split is the product: privacy is *why* the work is divided between device and cloud, not a side benefit. We name the trap most hybrid apps miss: `PREFER_ON_DEVICE` quietly sends private data to the cloud on devices without a model. Airlock refuses to do that |

## 4. Architecture

```
            ┤ YOUR LAPTOP (Chrome) ├                                 ┤ CLOUD ├
 ┌───────────────────────────────────────────────┐     ┌──────────────────────────────────────┐
 │ 1 READ   bill.jpg ─▶ Gemini Nano               │     │                                      │
 │          ONLY_ON_DEVICE · JSON schema          │     │                                      │
 │          → identity{} + lines[]                │     │                                      │
 │ 2 SEAL   identity ─▶ Vault (IndexedDB, AES-GCM)│     │                                      │
 │          lines[] ─▶ tokenise + regex sweep     │     │                                      │
 │          ─▶ AIRLOCK GUARD (deterministic)  ════╪═════╪▶ 3 AUDIT  Gemini (Firebase AI Logic) │
 │             refuses if any vault value leaks   │     │   ONLY_IN_CLOUD · Google Search      │
 │                                                │◀════╪═  → findings[] + letter{{TOKENS}}    │
 │ 4 WRITE  letter ─▶ rehydrate from Vault        │     │                                      │
 │          (string replace, no model)            │     │  Firestore: outcome counters only    │
 │ 5 EXPLAIN finding ─▶ PREFER_ON_DEVICE          │     │  Remote Config: policy               │
 │          (plain words, any language)           │     │  App Check + anonymous Auth          │
 └───────────────────────────────────────────────┘     └──────────────────────────────────────┘
```

| Stage | Mode | Why this mode |
|---|---|---|
| 1 Read | `ONLY_ON_DEVICE` | The raw image holds name, address, DOB, member ID and diagnosis. If Nano isn't available, we **must not** fall back to the cloud. The SDK throws and we route to the manual airlock |
| 2 Seal | no model | Deterministic: the guard must not depend on a model behaving |
| 3 Audit | `ONLY_IN_CLOUD` | Needs current billing rules (grounding) and a larger model. Sees only `lines[]` with tokens |
| 4 Write | no model | Rehydration is a string replace on the device |
| 5 Explain | `PREFER_ON_DEVICE` | Input is one finding with no identity, so a cloud fallback is safe. On-device is free and works offline |

### The guard (the invariant judges can check)

`guard(payload, vault) → { ok, leaks[] }` runs on the exact serialised body before every cloud call. It checks each vault value plus normalised variants (case-folded, whitespace and punctuation stripped, digits-only for IDs and phones, last-4 of long numbers, name initials with surname). Any hit blocks the call, shows the leak to the user, and writes a `blocked` row to the boundary ledger. Tests: `web/src/airlock/guard.test.ts`, including property tests that generate identities and try to smuggle them through in other formats.

### Data that leaves the device

Only: line items (description, CPT/HCPCS/revenue code, units, charge, allowed, paid, patient responsibility), service dates shifted to day offsets, provider *type* (not name) and US state, plan type, denial reason codes. Never: name, address, DOB, member/group/claim/account numbers, phone, email, provider name, or free-text diagnosis. ICD codes are dropped by default (Remote Config `send_icd=false`).

## 5. Firebase products

| Product | Job |
|---|---|
| **Firebase AI Logic** (Gemini Developer API backend) | `getGenerativeModel(ai, { mode, onDeviceParams, inCloudParams })` for every stage; `initializeDeviceModel()` with download progress on first use |
| **App Check** | reCAPTCHA Enterprise provider. Debug token documented for judges. Enforcement is on for AI Logic (Firebase enforced it for all projects on 2 Nov 2026) |
| **Authentication** | Anonymous sign-in; required by Firestore rules |
| **Remote Config** | `cloud_model`, `redaction_strictness`, `allow_manual_airlock`, `send_icd`, `audit_prompt_version`, `max_lines` |
| **Firestore** | `outcomes/{findingType}` counters: `disputed`, `won`, `lost`. Rules allow only `+1` increments by signed-in users |
| **Hosting** | The live demo URL |

## 6. Timeline

| When (IST) | Block | Done when |
|---|---|---|
| Wed 26, afternoon | Brand, design system, docs, repo skeleton | Logo on `main`; PLAN, TASKS, README pushed |
| Wed 26, night | Vite + React app, design tokens, landing page | Landing renders in the hex.tech style at 1440 and 390 px |
| Thu 27 | Guard + vault + tests; Read stage on Nano; fictional sample bills | `npm test` green; Read works on Chrome with Nano |
| Fri 28 | Audit stage (cloud, grounding); letter + rehydrate; boundary ledger; manual airlock | End-to-end on a sample bill |
| Sat 29 | Firestore outcomes, Remote Config, App Check; replay mode; deploy to Hosting; polish all states | Live URL works for a judge with no flags (replay) and with Nano |
| Sun 30, day | Record screen takes; voiceover (ElevenLabs); film cut (≤ 2:45); deck; README GIFs | `video/out/airlock.mp4` uploaded to YouTube (public) |
| Sun 30, evening | Submission form; licence visible in GitHub About; repo public | Submitted before 22:00 UTC (03:30 IST Mon) with 2+ hours spare |

## 7. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Nano reads bill images poorly (small text, tables) | Medium | Crop to the table region first; downscale to the model's best size; ask for JSON with a strict schema; let the user correct cells inline. Replay shows a real recorded run |
| Nano not available on the judge's machine | High | Manual airlock path + replay mode; the README's "judge in 90 seconds" names both |
| Nano model download takes minutes during the demo | Medium | Pre-download before recording; show the progress bar from `initializeDeviceModel` as a designed state |
| Cloud audit invents rules | Medium | Findings must cite a rule and a line number; grounding sources are listed under each finding; anything without a citation is shown as "question to ask", not "error" |
| App Check blocks the judges | Low | Debug token in the submission notes; replay mode needs no backend |
| Repo still private at submission | Low | Checklist item, plus licence visible in About |
| Time | High | Cut list below |

## 8. Cut list (in this order, if behind)

1. Android port
2. Dark mode
3. Explain stage in other languages (keep English)
4. Community outcomes page (keep the counter write)
5. Manual airlock canvas (fall back to "type the line items")

Never cut: the guard, `ONLY_ON_DEVICE` for Read, the boundary ledger, replay mode, the video.

## 9. Demo plan

`docs/demo-script.md` holds the 2:45 script: two narrators (an American voice for the patient's story, an Indian-English voice for how it's built), low background music, real screen recordings, and a sequence that switches to airplane mode.

## 10. Stretch: Android

The same pipeline in Kotlin with Firebase AI Logic's Android hybrid SDK (Gemini Nano via ML Kit Prompt API), sharing the prompts and JSON schemas from `shared/`. Only if the web submission is fully done by Saturday night.
