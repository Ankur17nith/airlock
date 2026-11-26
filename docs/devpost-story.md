## Inspiration

43% of American adults have received a medical bill they believed was wrong. Fewer than half of insured people ever challenge one, and the ones who do get it reduced or cancelled 38% of the time ([KFF Health Care Debt Survey](https://www.kff.org/policy-watch/could-consumer-assistance-be-helpful-to-people-facing-medical-debt/), [Commonwealth Fund 2024](https://commonwealthfund.org/sites/default/files/2024-07/Gupta_unforeseen_bills_coverage_denials_PR_2024-08-01.pdf)).

The work in between is reading billing codes, knowing the rules and writing a letter. Language models are good at all three. But today, asking one for help means pasting your name, date of birth, insurance ID and diagnosis into a chatbot. We wanted the help without the handover.

Hybrid inference made that possible: the model that knows your name and the model that knows billing rules never have to see the same document.

## What it does

**Airlock audits a medical bill and writes the dispute letter, and the parts of the bill that identify you never leave your device.**

1. **Read, on device.** Gemini Nano reads a photo of the bill inside Chrome and returns structured JSON: identity fields and line items.
2. **Seal, on device.** Identity goes into an encrypted vault (AES-GCM, IndexedDB, deleted after 24 hours) and is replaced by tokens like `⟦PATIENT_NAME⟧`. Calendar dates become day offsets.
3. **Guard.** Before any request leaves the page, plain code (not a prompt) scans the exact outgoing bytes for every sealed value, written any way: upper case, reordered, digits only, the last six digits, a birthday in fourteen formats. One hit and the request is refused.
4. **Audit, in the cloud.** Gemini checks the anonymous codes and amounts for duplicates, unbundling, upcoding and surprise-billing protections. Every finding names its lines and the rule it relies on, and Gemini drafts the dispute letter with placeholders.
5. **Write, on device.** Your real details are filled back into the letter locally. The finished letter never leaves your laptop.
6. **Explain.** Ask what any finding means in plain words. It runs on-device when Nano is there, and in the cloud when it isn't.

A **boundary panel** lists everything that crossed to the cloud, every block and every on-device step, and can be exported as JSON. You can open DevTools, search the Gemini request for your name, and not find it.

On our fictional sample ER bill, a live run found the same wrist X-ray billed twice (**$212**), a splint supply billed separately from the splinting (**$96**), and a blood draw with no lab test on the bill (**$48**).

## How we built it

**Firebase AI Logic is the core, and the split between device and cloud is the product, not a fallback.** Each stage uses the inference mode its data demands:

| Stage | Mode | Why |
|---|---|---|
| Read the bill photo | `ONLY_ON_DEVICE` | The image holds identity. `PREFER_ON_DEVICE` would quietly send it to the cloud on a device without Nano; `ONLY_ON_DEVICE` throws instead, and Airlock offers manual entry |
| Audit the charges | `ONLY_IN_CLOUD` | Needs a larger model and current rules. It only ever sees codes and amounts |
| Explain a finding | `PREFER_ON_DEVICE` | No identity in the input, so a cloud fallback is safe |

Every model output in the UI shows its real `inferenceSource` from the SDK response, never a guess.

**The other Firebase products each do a real job:**
- **App Check** (reCAPTCHA Enterprise) protects AI Logic.
- **Anonymous Authentication** gates the only Firestore write.
- **Remote Config** holds the cloud model, a fallback model, grounding on/off and privacy settings, so they change without a redeploy.
- **Firestore** keeps anonymous outcome counters (finding type × disputed / won / lost) under increment-only security rules. No names, amounts or text.
- **Hosting** serves the app behind a strict Content Security Policy: no third-party scripts or analytics, nowhere else for a bill to go.

**Stack:** Vite, React 19, TypeScript and Motion. The privacy core (vault, sweep, guard, ledger) is pure TypeScript with 56 Vitest tests, including property tests that generate identities and try to smuggle them through in seven formats. The guard wraps `window.fetch`, so nothing can route around it. A GitHub Actions pipeline tests, builds and deploys on every push. The design system is adapted from hex.tech: paper and grid, coral for "stays on the device", teal for "crosses the wall".

The demo film is also built from code: the real app screen-recorded with a scripted cursor, scenes rendered frame by frame, and two narrators voiced with ElevenLabs.

## Challenges we ran into

- **The silent fallback.** The obvious hybrid setting, `PREFER_ON_DEVICE`, is exactly how private data leaks: no model on the device, and the photo goes to the cloud. We had to design the whole flow around refusing that, including a manual path for devices without Nano.
- **A guard that catches an ID written five ways.** A model that removes names is not a reliable last barrier. Writing a deterministic check that catches `XGH884120937`, `884-120-937` and `…120937`, without flagging CPT codes that happen to equal a ZIP code, took careful variant rules and property tests.
- **Free-tier reality.** On the free Gemini tier, Google Search grounding has no quota and the main model sometimes returns "high demand" errors. The audit now tries grounded, then ungrounded, then a lighter fallback model (all set in Remote Config), and the UI says plainly when rules come from the model's own knowledge rather than a live search.
- **Dense tables on a small model.** Bills are tight tables. We constrain Nano's output with a JSON schema and let the user correct any misread cell, which re-seals and re-checks the payload.

## Accomplishments that we're proud of

- A privacy boundary you can watch, export and test, not just a promise in a privacy policy.
- One SDK, three inference modes, each with a stated reason.
- An end-to-end live run on our Firebase project, through App Check and the guard, that found $308 of questionable charges on the sample bill.

## What we learned

- Hybrid inference is most valuable when the split itself carries meaning. Here it is the line between what identifies you and what doesn't.
- `inferenceSource` matters: showing users where each answer actually ran builds more trust than any copy we could write.
- Plan for quotas and busy models from day one; a fallback chain in Remote Config costs little and keeps the product working.

## What's next for Airlock

- **Android** (Gemini Nano) and **iOS** (Apple Foundation Models) through the same Firebase AI Logic SDK.
- **A workspace for patient advocates** and billing counsellors, who are bound to confidentiality.
- **India:** cashless-claim (TPA) rejections, the same shape of problem.
- Publishing the anonymous outcome counters, so people can see which kinds of dispute actually win.

*The patient, bill and hospital in every sample are fictional. Airlock is not legal or medical advice: findings are questions to put to your billing office.*
