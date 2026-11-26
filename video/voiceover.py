"""Generate the voiceover with ElevenLabs, one file per line, with character timestamps.

MAYA  (American English): premade "Sarah", eleven_multilingual_v2
ARJUN (Indian English):   premade "Eric", eleven_v3 with an accent tag
Usage: ELEVENLABS_API_KEY=... python3 video/voiceover.py [ids...]
"""
import base64, json, os, sys, urllib.request
from pathlib import Path

HERE = Path(__file__).parent
VOICES = {
    "maya":  {"voice_id": "EXAVITQu4vr4xnSDxMaL", "model_id": "eleven_multilingual_v2", "prefix": "",
              "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True}},
    "arjun": {"voice_id": "cjVigY5qzO86Huf0OWal", "model_id": "eleven_v3", "prefix": "[Indian English accent] [calm] ",
              "voice_settings": {"stability": 0.5}},
}

def tts(line):
    v = VOICES[line["voice"]]
    body = {"text": v["prefix"] + line["text"], "model_id": v["model_id"], "voice_settings": v["voice_settings"]}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{v['voice_id']}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)

def main():
    lines = json.loads((HERE / "lines.json").read_text())
    only = set(sys.argv[1:])
    out = HERE / "vo"; out.mkdir(exist_ok=True)
    for line in lines:
        if only and line["id"] not in only:
            continue
        d = tts(line)
        (out / f"{line['id']}.mp3").write_bytes(base64.b64decode(d["audio_base64"]))
        (out / f"{line['id']}.json").write_text(json.dumps({"line": line, "alignment": d.get("normalized_alignment") or d.get("alignment")}))
        print(line["id"], line["voice"], "ok")

if __name__ == "__main__":
    main()
