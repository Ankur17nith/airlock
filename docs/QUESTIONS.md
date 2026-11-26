# Open questions

Decisions that need a human, or facts we haven't verified yet. Each answer gets a date.

| # | Question | Default if unanswered | Answer |
|---|---|---|---|
| 1 | Which Firebase project and region? | `airlock-hybrid`, Gemini Developer API, Firestore `us-central1` | |
| 2 | Is the repo made public before or after the video is final? | Public on Sun 30 after the final push | Private for now (26 Nov) |
| 3 | Cloud model name? | `gemini-3.8-flash` via Remote Config `cloud_model`; switch without a redeploy | |
| 4 | Does Nano read a full-page bill at once, or do we need to crop to the table? | Crop to the line-item table, then read header and table separately | Test on Thu 27 |
| 5 | Should India (TPA cashless-claim rejections) be in the film, or only in the docs? | Docs + one line in the film | |
| 6 | Android stretch: Kotlin native or Flutter? | Kotlin (Firebase AI Logic hybrid on Android is documented for Kotlin) | |
