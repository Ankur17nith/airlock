# Demo film script: *Airlock* (target 2:45, hard cap 3:00)

**Voices (ElevenLabs).**
- **MAYA:** American English, warm, mid-30s, conversational. Carries the patient's story. *(ElevenLabs premade "Sarah", `eleven_multilingual_v2`.)*
- **ARJUN:** Indian English, clear, calm, builder. Carries how it works. *(ElevenLabs premade "Eric", `eleven_v3` with an `[Indian English accent]` tag. The free tier blocks library voices such as "Ranbir" over the API; an upgrade would allow a native Indian-English voice.)*

The recorded lines live in `video/lines.json`; this table is the plan they came from.

The alternation is deliberate: the problem is told by the person who has it, the solution by the person who built it.

**Music.** One low instrumental bed, ducked to about −24 dB under speech and −18 dB in gaps; it swells only on the title card and the end card. Credited in the description.

**Look.** Follows `docs/DESIGN.md` and the Beacon reference film: dark stat cards for the problem, warm paper scenes for the product, an isometric block diagram for the architecture, real screen captures (never mock-ups), and big kinetic captions that repeat the key words.

**Rules.** Every on-screen record is the fictional sample bill (`Maya R. Ellison`, invented member ID). No real person's data appears.

---

| # | Time | Picture | Voice | On-screen text |
|---|---|---|---|---|
| 1 | 0:00–0:07 | Dark. A phone photo of a hospital bill slides in; the total **$1,284.00** is circled in coral | **MAYA:** "This is my ER bill. Twelve hundred and eighty-four dollars — for a sprained wrist." | `$1,284.00` |
| 2 | 0:07–0:22 | Dark stat cards, counting up, one after another (Beacon style) | **MAYA:** "Forty-three percent of Americans have had a bill they thought was wrong. Fewer than half ever push back. The ones who do? More than a third get it cut." | `43%` *got a bill they believed was wrong* · `< ½` *ever challenge one* · `38%` *of disputes win* (sources in small mono) |
| 3 | 0:22–0:33 | A generic chat box; the bill is pasted in; name, DOB, member ID and diagnosis light up coral one by one | **MAYA:** "So why not just ask an AI? Because to ask, I'd have to hand over my name, my birthday, my insurance ID… my diagnosis." | `NAME` `DOB` `MEMBER ID` `DIAGNOSIS` → *all of it, to a server* |
| 4 | 0:33–0:39 | Paper background, grid draws in. Logo mark: the dot splits at the wall. **AIRLOCK** / *Fight the bill, not your privacy.* | **ARJUN:** "So we built Airlock." | Title card |
| 5 | 0:39–1:01 | Isometric diagram: left block **YOUR LAPTOP** (coral), a wall, right block **CLOUD** (teal). Cubes for *Gemini Nano*, *Vault*, *Guard*, *Gemini*, *Firestore*, *Remote Config*. Line items travel across the wall; a coral cube stays behind | **ARJUN:** "Airlock splits the work across a wall. On your laptop, Gemini Nano reads the bill — in *only-on-device* mode, so it can never quietly fall back to the cloud. Your identity goes into a vault. Only anonymous line items cross, and cloud Gemini audits them against real billing rules, grounded in Google Search." | `ONLY_ON_DEVICE` · `ONLY_IN_CLOUD` · *one Firebase AI Logic SDK* |
| 6 | 1:01–1:24 | **Screen:** landing → *Check a bill* → drop `bill.jpg`. The Read step runs; badge **● ON DEVICE · Gemini Nano**. The Seal animation: *Maya R. Ellison* strikes through and collapses into `⟦PATIENT_NAME⟧`, then member ID, DOB, hospital name | **ARJUN:** "Watch. Nano reads the photo, right here. Name, member ID, birthday, the hospital — each one becomes a token. The real values stay in an encrypted vault on this laptop." | `Read · on device` → `Sealed: 6 identifiers` |
| 7 | 1:24–1:38 | **Screen:** the Crossing review. The boundary panel shows the outgoing JSON. Then the guard demo: a description containing `MBR 88412-0937` is caught; a red **BLOCKED** row appears | **ARJUN:** "Before a single byte leaves, a guard — written in code, not in a prompt — checks it. Hide an ID in a description, and the request is blocked." | `BLOCKED · member ID in line 7` |
| 8 | 1:38–2:00 | **Screen:** Audit runs; badge **● IN CLOUD · Gemini**. Findings appear with amber borders: *Duplicate charge, CT 73110 X-ray, $212.00*; *Level 5 ER visit for a wrist sprain: ask for the documentation*. Each shows its cited rule | **MAYA:** "It found the X-ray, billed twice: two hundred and twelve dollars. And it questioned a level-five ER code for a sprained wrist — and told me which rule it's relying on." | `$212.00` counts up |
| 9 | 2:00–2:15 | **Screen:** the letter. Tokens flip, left to right, into real values: `⟦PATIENT_NAME⟧` → *Maya R. Ellison* | **ARJUN:** "The cloud drafts the dispute letter with placeholders. Back on the device, Airlock fills in the real details. The finished letter never leaves your laptop." | `Rehydrated on device` |
| 10 | 2:15–2:29 | **Screen:** macOS airplane mode on (Wi-Fi icon off). Tap *Explain this finding*; the badge says **● ON DEVICE**; a plain-English paragraph streams in | **ARJUN:** "Turn the internet off, and the private half still works. Explanations run on-device when they can, in the cloud when they can't — because they carry no identity." | `offline · on device` |
| 11 | 2:29–2:38 | Paper strip of six Firebase product cards drawing in: AI Logic (hybrid) · App Check · Auth · Remote Config · Firestore · Hosting | **ARJUN:** "One SDK. Three inference modes, each chosen on purpose." | product names |
| 12 | 2:38–2:45 | End card: logo, URL, *Open source · Apache-2.0* | **MAYA:** "Airlock. Fight the bill — not your privacy." | `airlock-hybrid.web.app` · `github.com/Ankur17nith/airlock` |

Word count ≈ 330, about 150 words a minute with room to breathe.

## Recording checklist (screen takes)

- Chrome 1920×1080, zoom 100%, bookmarks bar hidden, DevTools closed, notifications off.
- Nano already downloaded (`chrome://on-device-internals` shows *ready*).
- Take A (scenes 6–9): one continuous run on `samples/er-wrist.jpg`.
- Take B (scene 7, guard): run with `?guard-demo=1`, which injects the ID into line 7.
- Take C (scene 10): airplane mode on, then *Explain*.
- Record at 60 fps; the film is cut at 30 fps.

## If something goes wrong during a take

| Symptom | Do |
|---|---|
| Nano says *downloadable* | Press *Prepare on-device model*, wait for 100%, retake |
| Read misreads a cell | Fix it inline (that's a feature, keep it in the take) or retake |
| Audit slow (> 10 s) | Keep the take and speed the wait up 4× with a visible `4×` mark. Never hide that it was sped up |
| App Check 403 | Re-register the debug token; check `VITE_RECAPTCHA_SITE_KEY` |
| Anything else | `?replay=1` plays a recorded real run; caption it *replay of a recorded run* |
