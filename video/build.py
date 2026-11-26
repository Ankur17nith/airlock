"""Mix the soundtrack, encode the film, write captions and a poster.

  python3 -I video/build.py            (after capture-app.js and render.js)

Audio: every voice line is loudness-matched to -16 LUFS and placed at its cue;
the music bed sits low (gap level from timeline.json) and is side-chain
ducked under speech; the master is normalised to -14 LUFS / -1.5 dBTP
(YouTube's reference). Output: video/out/airlock.mp4, .srt, poster.jpg.
"""
import json, re, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from words import words  # noqa: E402

TL = json.loads((HERE / "timeline.json").read_text())
WORK, OUT = HERE / "work", HERE / "out"
OUT.mkdir(exist_ok=True)
FPS, DUR = TL["fps"], TL["duration"]


def run(*cmd):
    subprocess.run([str(c) for c in cmd], check=True)


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    return float(json.loads(r.stderr[r.stderr.rindex("{"):])["input_i"])


def voice_track():
    parts, labels = [], []
    for i, v in enumerate(TL["vo"]):
        src = HERE / "vo" / f"{v['id']}.mp3"
        gain = -16 - lufs(src)
        parts.append(f"[{i}:a]aresample=48000,volume={gain:.2f}dB,adelay={int(v['at'] * 1000)}:all=1[v{i}]")
        labels.append(f"[v{i}]")
    graph = ";".join(parts) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:normalize=0:duration=longest,apad=whole_dur={DUR}[vo]"
    out = WORK / "vo.wav"
    args = []
    for v in TL["vo"]:
        args += ["-i", HERE / "vo" / f"{v['id']}.mp3"]
    run("ffmpeg", "-v", "error", "-y", *args, "-filter_complex", graph, "-map", "[vo]", "-t", DUR, "-ar", 48000, "-ac", 2, out)
    return out


def mix(vo):
    m = TL["music"]
    out = WORK / "mix.wav"
    graph = (
        f"[1:a]aresample=48000,atrim=0:{DUR},volume={m['gapDb']}dB,afade=t=in:d=1.5,afade=t=out:st={DUR - m['fadeOut']}:d={m['fadeOut']}[bed];"
        f"[0:a]asplit=2[vo1][vo2];"
        # duck the bed by about (gapDb - underSpeechDb) dB while anyone speaks
        f"[bed][vo1]sidechaincompress=threshold=0.015:ratio=6:attack=25:release=450:makeup=1[duck];"
        f"[vo2][duck]amix=inputs=2:normalize=0:duration=first,"
        f"loudnorm=I=-14:TP=-1.5:LRA=9[out]"
    )
    run("ffmpeg", "-v", "error", "-y", "-i", vo, "-i", HERE / m["file"], "-filter_complex", graph, "-map", "[out]", "-ar", 48000, out)
    return out


def captions():
    """SRT from the word timings: one sentence or clause per cue, at most 42 characters."""
    def ts(s):
        h, rem = divmod(s, 3600); m, sec = divmod(rem, 60)
        return f"{int(h):02d}:{int(m):02d}:{int(sec):02d},{int(round((sec % 1) * 1000)) % 1000:03d}"
    cues = []
    for v in TL["vo"]:
        cur = []
        for w in words(v["id"]):
            nxt = " ".join(x["w"] for x in cur + [w])
            if cur and len(nxt) > 42:  # would overflow: close the cue before this word
                cues.append([v["at"] + cur[0]["s"], v["at"] + cur[-1]["e"], " ".join(x["w"] for x in cur)]); cur = []
            cur.append(w)
            if re.search(r"[.?!]$|\.\.\.$", w["w"]) or (len(" ".join(x["w"] for x in cur)) >= 24 and w["w"].endswith(",")):
                cues.append([v["at"] + cur[0]["s"], v["at"] + cur[-1]["e"], " ".join(x["w"] for x in cur)]); cur = []
        if cur:
            cues.append([v["at"] + cur[0]["s"], v["at"] + cur[-1]["e"], " ".join(x["w"] for x in cur)])
    srt = []
    for i, (a, b, t) in enumerate(cues):
        nxt = cues[i + 1][0] if i + 1 < len(cues) else DUR
        end_ = min(max(b + .3, a + 1.0), nxt - .05)
        srt.append(f"{i + 1}\n{ts(a)} --> {ts(end_)}\n{t.replace('...', '…')}\n")
    (OUT / "airlock.srt").write_text("\n".join(srt))


def encode(audio):
    frames = WORK / "film"
    n = len(list(frames.glob("f*.jpg")))
    assert n == round(DUR * FPS), f"expected {round(DUR * FPS)} frames, found {n}"
    # poster: the settled title card, baked in as frame 0 so every platform's thumbnail shows it
    poster_t = 36.6
    shutil.copy(frames / f"f{round(poster_t * FPS):05d}.jpg", OUT / "poster.jpg")
    shutil.copy(OUT / "poster.jpg", frames / "f00000.jpg")
    run("ffmpeg", "-v", "error", "-y", "-framerate", FPS, "-i", frames / "f%05d.jpg", "-i", audio,
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
        "-c:a", "aac", "-b:a", "192k", "-shortest", OUT / "airlock.mp4")


if __name__ == "__main__":
    vo = voice_track()
    audio = mix(vo)
    captions()
    encode(audio)
    print("done:", OUT / "airlock.mp4")
