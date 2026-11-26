# Submission text (Devpost)

*Paste into the #BuildHybridAI 2026 form. Fill in the bracketed links on Sunday.*

**Platform:** Web (Chrome) · **Project status:** New (repository created 26 Nov 2026) · **Live:** [https://airlock-hybrid.web.app] · **Video:** [YouTube link] · **Repo:** https://github.com/Ankur17nith/airlock (Apache-2.0)

## Inspiration

43% of American adults have received a medical bill they believed was wrong. Fewer than half of insured people ever challenge one, and those who do get it cut 38% of the time. The work in between (reading codes, knowing the rules, writing the letter) is exactly what language models are good at. But asking one means pasting your name, birthday, insurance ID and diagnosis into a chatbot. We wanted the help without the handover.

## What it does

Airlock audits a medical bill or insurance denial and writes the dispute letter, and the parts of the bill that identify you never leave your device.

1. **Read (on device).** Gemini Nano, through Firebase AI Logic with `InferenceMode.ONLY_ON_DEVICE`, reads a photo of the bill into structured JSON: identity fields and line items.
2. **Seal (on device).** Identity goes into an encrypted vault and is replaced with tokens. A regex sweep catches stray identifiers.
3. **Guard.** A deterministic check scans the exact outgoing request for every sealed value and its variants, and blocks the request if it finds one. The user sees every crossing in a live boundary panel.
4. **Audit (cloud).** Gemini, with `ONLY_IN_CLOUD` and Google Search grounding, checks the anonymous line items for duplicates, unbundling, upcoding and surprise-billing protections, cites the rule behind each finding, and drafts the letter with placeholders.
5. **Write (on device).** Airlock fills the real details back into the letter locally.
6. **Explain (hybrid).** Plain-language explanations use `PREFER_ON_DEVICE`: on-device and offline when possible, cloud otherwise. That's safe because they carry no identity.

## How we used Firebase AI Logic

Hybrid inference isn't a fallback in Airlock; it *is* the product. Each stage uses the mode its data demands:

| Stage | Mode | Why |
|---|---|---|
| Read the bill | `ONLY_ON_DEVICE` | `PREFER_ON_DEVICE` would silently send the photo to the cloud on a device without Nano. We refuse that and offer a manual redaction path instead |
| Audit | `ONLY_IN_CLOUD` + `googleSearch` | Needs current rules and a bigger model; sees only anonymous data |
| Explain | `PREFER_ON_DEVICE` | No identity in the input, so a fallback is safe |

Every model output in the UI shows its real `inferenceSource` from the SDK response.

**Other Firebase products:**
- **App Check** (reCAPTCHA Enterprise) protects AI Logic.
- **Anonymous Authentication** gates Firestore.
- **Remote Config** sets the cloud model, redaction strictness and policy switches without a redeploy.
- **Firestore** stores anonymous outcome counters (disputed / won / lost per finding type).
- **Hosting** serves the app with a strict Content Security Policy.

## How we built it

- **Stack:** Vite, React 19, TypeScript and Motion; Vitest with property tests for the guard.
- **Design:** a design system adapted from hex.tech.
- **Docs:** everything is in `docs/`: plan, architecture, privacy model, business case and runbook.

## Challenges

- Getting a small on-device model to read dense bill tables reliably: we crop, constrain output with a JSON schema, and let the user correct cells inline.
- Designing for the device without Nano without breaking the promise.
- Making a guard that catches an ID written five different ways.

## Accomplishments

- A privacy boundary you can watch, export and test.
- One SDK, three inference modes, each with a reason.

## What we learned

[fill in Sunday from `docs/LEARNINGS.md`]

## What's next

- Android (Gemini Nano) and iOS (Apple Foundation Models) through the same SDK.
- A workspace for patient advocates.
- Indian cashless-claim (TPA) rejections.

## For judges

- **Without Nano:** open `[live URL]?replay=1` to watch a recorded real run, labelled as a replay. Or use the manual airlock in any browser.
- **With Nano:** Chrome 139+ with `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled.
- **App Check debug token:** [token]
