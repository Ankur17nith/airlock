# Human runbook

The steps an agent can't do: anything in the Firebase or Google Cloud console, the browser flags, the recording and the submission. Do them in order. Each step says what you should see.

## 1. Firebase project (≈15 min)

1. <https://console.firebase.google.com> → **Add project** → name `airlock-hybrid` (any name works). Google Analytics: off.
2. **Build → AI Logic → Get started** → choose **Gemini Developer API** (free tier). You should see *"Gemini Developer API enabled"*.
3. **Project settings → General → Your apps → Web (`</>`)** → nickname `airlock-web`, tick **Firebase Hosting**. Copy the `firebaseConfig` object.
4. Paste the values into `web/.env.local` (copy from `web/.env.example`):
   ```
   VITE_FB_API_KEY=...
   VITE_FB_AUTH_DOMAIN=...
   VITE_FB_PROJECT_ID=...
   VITE_FB_APP_ID=...
   VITE_RECAPTCHA_SITE_KEY=...   # step 2.2
   ```
   These values are public by design (they identify the app; App Check and rules protect it). `.env.local` is gitignored anyway.

## 2. App Check (≈10 min)

1. **Build → App Check → Apps → airlock-web → reCAPTCHA Enterprise** → create a key for your hosting domain and `localhost`. Save.
2. Put the site key in `VITE_RECAPTCHA_SITE_KEY`.
3. For local development and for judges: run the app with `?debug-appcheck=1`. The console prints a debug token. Add it under **App Check → Apps → ⋮ → Manage debug tokens**. Put a dedicated judge token in the submission notes. Never commit it.
4. AI Logic enforcement is already on (Firebase enforced App Check for AI Logic in all projects on 2 Nov 2026).

## 3. Authentication, Firestore, Remote Config (≈5 min)

1. **Authentication → Sign-in method → Anonymous → Enable.**
2. **Firestore → Create database** → production mode → a region near you. Then run `npm run deploy:rules` from `web/`.
3. **Remote Config:** run `npm run deploy:config` (publishes `remoteconfig.template.json`). You should see six parameters.

## 4. Chrome with Gemini Nano (≈10 min plus download)

1. Chrome desktop 139 or later (`chrome://settings/help`).
2. `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` → **Enabled** → relaunch.
3. Open the app and press **Prepare on-device model** once (the download needs a click). Watch progress reach 100%. Or check `chrome://on-device-internals`.
4. Check: the badge in the app header says **● ON DEVICE · Gemini Nano ready**.

## 5. Deploy

```bash
cd web && npm ci && npm run check && npm run deploy
```

You should get `Hosting URL: https://<project>.web.app`. Open it in Chrome with Nano, then in Safari/Firefox (manual airlock path) and with `?replay=1`.

## 6. Record (Sunday)

Follow `docs/demo-script.md` scene by scene. Before recording:
- [ ] Nano downloaded; Wi-Fi on; notifications off; browser zoom 100%; window 1920×1080
- [ ] Sample bill printed or on a second screen to photograph
- [ ] Airplane mode toggle ready for scene 5

## 7. Submit (Sunday evening, before 22:00 UTC / 03:30 IST Monday)

- [ ] Repo **public**; About shows the Apache-2.0 licence; topics `firebase`, `gemini-nano`, `hybrid-ai`
- [ ] YouTube video **public**, ≤ 3:00, English captions
- [ ] Devpost form: text from `docs/submission.md`, platform **Web (Chrome)**, project **New**
- [ ] Judge notes: live URL, App Check debug token, `?replay=1`, Nano flag steps
