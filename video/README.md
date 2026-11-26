# The demo film

A 2:45 film made by code, following the approach of [latent-spaces/brag](https://github.com/latent-spaces/brag): every frame is a pure function of time, and the product shots are the real app, not mock-ups.

| Step | File | What it does |
|---|---|---|
| Script | [`../docs/demo-script.md`](../docs/demo-script.md), [`lines.json`](lines.json) | Twelve lines, two narrators |
| Voice | [`voiceover.py`](voiceover.py) | ElevenLabs. **Maya** (American English): premade *Sarah*, `eleven_multilingual_v2`. **Arjun** (Indian English): premade *Eric*, `eleven_v3` with an accent tag. Saves `vo/NN.mp3` plus character timestamps |
| Cues | [`words.py`](words.py), [`timeline.json`](timeline.json) | Word timings from the voiceover, so animations land on the spoken word |
| Product take | [`capture-app.js`](capture-app.js) | Screen-records the real app (sample-run mode) through Chrome's screencast, with a scripted cursor timed to the voiceover |
| Frames | [`film.html`](film.html), [`render.js`](render.js) | Nine scenes in one page; `render(t)` draws any moment; 4,950 frames at 1920×1080, 30 fps |
| Mix + encode | [`build.py`](build.py) | Voice lines loudness-matched to −16 LUFS; music bed low and side-chain ducked under speech; master −14 LUFS / −1.5 dBTP; H.264 + AAC; English captions (SRT) from the word timings; poster baked in as frame 0 |

## Rebuild

```bash
cd web && npm run build && npx vite preview --port 4173 &   # the app, for the product take
cd ..
python3 video/voiceover.py                                  # only if lines.json changed (uses ELEVENLABS_API_KEY)
node video/capture-app.js http://localhost:4173 video/work/app
node video/render.js
python3 -I video/build.py                                   # → video/out/airlock.mp4, airlock.srt, poster.jpg
```

## Honest labels

- Scenes 6–9 are the real app recorded in **sample-run mode**: the model outputs are scripted (the app says so in its own badge, and the film says so under the window). After the Firebase project is connected, re-record this take in live mode with Gemini Nano (`?replay=1` removed) and rebuild. Nothing else changes.
- Scene 10 (offline explain) is an **illustration** and is labelled as one.
- The patient, bill and hospital are fictional.

Music: "Happy Beats / Business Moves Vol. 1" by Sascha Ende, [ende.app](https://ende.app/en), CC BY 4.0 (see [`music/CREDITS.md`](music/CREDITS.md)).
