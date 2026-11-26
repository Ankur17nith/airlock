# The privacy model

Airlock makes one promise: **the parts of your bill that identify you never leave your device.** This page says exactly what that means, how the code enforces it, and where its limits are.

## What stays, what crosses

| Stays on the device | Crosses to the cloud (after the guard passes) |
|---|---|
| Your name, and anyone else's on the bill | Line-item descriptions (swept for identifiers) |
| Street address, ZIP, phone, email | CPT / HCPCS / revenue codes, units, modifiers |
| Date of birth | Billed, allowed, paid and patient-responsibility amounts |
| Member, group, claim, account and policy numbers | Service dates as day offsets (`day 0`, `day 1`), not calendar dates |
| Provider and facility names | Provider *type* (`emergency department`) and US state |
| Diagnosis text and ICD codes (unless you opt in) | Plan type (`PPO`, `HDHP`) and denial reason codes (`CO-197`) |
| The image itself | |

## Four layers, none of which trusts the one before it

1. **The model can't run elsewhere.** Reading the bill uses `InferenceMode.ONLY_ON_DEVICE`. If Gemini Nano isn't available, the SDK throws. It doesn't fall back to the cloud. Airlock then offers the manual airlock.
2. **Tokenisation.** Identity fields go into the vault and are replaced with tokens like `⟦PATIENT_NAME⟧`.
3. **Sweep.** A regex pass over every remaining string catches identifiers the model put in the wrong field (a phone number inside a description, an account number in a footer line).
4. **The guard.** Before *any* cloud request, a deterministic check scans the serialised body for every vault value and its variants (see `docs/architecture.md`). A hit blocks the request. The guard is the last code before the network: it wraps `fetch` itself.

The guard is deliberately not a model. Models are good at finding identifiers. They're not a reliable final barrier.

## What we keep, and where

| Data | Where | Lifetime |
|---|---|---|
| Vault (identity ↔ tokens) | IndexedDB, AES-GCM with a non-extractable WebCrypto key | Until you press *Forget this bill*, or 24 hours |
| Bill image | Memory only | The tab's lifetime |
| Boundary ledger | Memory; exportable as JSON | The tab's lifetime |
| Outcome counter | Firestore `outcomes/{findingType}` | Aggregate counts only: no uid, no amounts, no text |

## The manual airlock (devices without Gemini Nano)

You draw black boxes over your name, address and ID numbers on a canvas. Airlock shows you the exact image that will be sent and asks you to confirm *"Send exactly this."* The redaction is burned into the pixels (new canvas, no layers), and the guard still checks the cloud's text response before it's displayed. This path is clearly labelled: here the cloud model reads the redacted image, so the protection is your redaction, not Nano.

## Limits, stated plainly

- **Rare codes can identify people.** A very rare procedure in a small state on a given day offset could narrow down who a patient is. Mitigations: dates are offsets, the provider is reduced to a type, ICD codes are off by default. This is k-anonymity in spirit, not a formal guarantee.
- **The cloud provider sees the anonymous line items.** They're governed by the Gemini Developer API terms. Airlock does not make them HIPAA-covered processing.
- **Your device is trusted.** Malware on your machine defeats any on-device design.
- **Airlock isn't legal or medical advice.** Findings are questions to put to the billing office, with the rule they rely on cited.

## How to check it yourself

1. Open DevTools → Network, run a bill, and inspect the one request to `firebasevertexai.googleapis.com` / `generativelanguage.googleapis.com`. Search it for your name.
2. The boundary panel's **Export ledger** gives the same payloads as JSON.
3. Run the tests: `cd web && npm test -- guard`.
