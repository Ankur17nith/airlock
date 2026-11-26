"""Word timings per voiceover line (accent tags removed). Used for cues and captions."""
import json, re
from pathlib import Path
VO = Path(__file__).parent / "vo"

def words(line_id):
    d = json.loads((VO / f"{line_id}.json").read_text())
    a = d["alignment"]; chars, st, en = a["characters"], a["character_start_times_seconds"], a["character_end_times_seconds"]
    text = "".join(chars)
    # drop [tags]
    keep = [True] * len(chars)
    for m in re.finditer(r"\[[^\]]*\]\s*", text):
        for i in range(m.start(), m.end()): keep[i] = False
    out, cur = [], None
    for i, ch in enumerate(chars):
        if not keep[i]: continue
        if ch.isspace():
            if cur: out.append(cur); cur = None
            continue
        if cur is None: cur = {"w": ch, "s": st[i], "e": en[i]}
        else: cur["w"] += ch; cur["e"] = en[i]
    if cur: out.append(cur)
    return out

if __name__ == "__main__":
    for f in sorted(VO.glob("*.json")):
        ws = words(f.stem)
        print(f.stem, " ".join(f"{w['w']}@{w['s']:.1f}" for w in ws))
