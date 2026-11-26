# Status

Updated at every milestone. Newest first.

| When (IST) | State |
|---|---|
| 26 Nov, evening | Web app built: landing page (hex.tech style), checker flow (read → seal → guard → audit → findings → letter), boundary panel, manual entry for devices without Nano, sample-run and guard-demo modes. 54 tests green (guard property tests included). Firebase config files (hosting CSP, increment-only rules, Remote Config template). Draft film rendered (2:45, two narrators, low music bed, captions) and a 10-slide deck. **Blocked on the human:** Firebase project + web config (runbook §1–3) to run live on Gemini Nano, then re-record the product take in live mode |
| 26 Nov, afternoon | Repo created. Brand, design system, plan, architecture, privacy model, business case, demo script and submission draft on `main`. Next: scaffold `web/` and build the landing page |

## Checklist against the hackathon rules

| Requirement | State |
|---|---|
| Gen AI app using Firebase AI Logic, imported and called at runtime | done in code (`web/src/ai/stages.ts`); needs a Firebase project to run live |
| Platform: Web (Chrome) with Gemini Nano via Firebase AI Logic | done in code (`ONLY_ON_DEVICE` read); live test pending |
| App Check (debug tokens accepted) | wired (`?debug-appcheck`); needs the reCAPTCHA key |
| Public repo with all source, assets and instructions | private until Sun 30 |
| Open-source licence detectable in the GitHub About section | Apache-2.0 committed |
| Demo video ≤ 3:00, public on YouTube, English | draft cut 2:45 with captions; replace product take with a live run, then upload |
| Text description: Firebase AI Logic usage, features, value proposition | draft in `docs/submission.md` |
| Hosted URL (encouraged) | planned (T4) |
