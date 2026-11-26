"""Turn timestamped screencast frames into a constant-frame-rate clip.
python3 video/cfr.py video/work/app video/work/app.mp4"""
import json, subprocess, sys
from pathlib import Path
src, out = Path(sys.argv[1]), sys.argv[2]
meta = json.loads((src / "frames.json").read_text())
fr = meta["frames"]
lines = []
for i, f in enumerate(fr):
    dur = (fr[i + 1]["ts"] - f["ts"]) if i + 1 < len(fr) else 1.0
    lines += [f"file '{(src / f['name']).resolve()}'", f"duration {max(dur, 0.001):.4f}"]
lines.append(f"file '{(src / fr[-1]['name']).resolve()}'")
(src / "concat.txt").write_text("\n".join(lines) + "\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(src / "concat.txt"),
                "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", "-preset", "medium", out], check=True)
print(out)
