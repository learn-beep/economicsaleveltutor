#!/usr/bin/env python3
"""
Generic export: bank app export (data/index.js + data/img/*.js) -> site data files. Handles both bank formats.

    python scripts/export.py --bank "<Question Bank folder>" --topics topics.json --config site.config.json
    python scripts/export.py ... --images [--only <bundle>]     # WebP crops; run on Tom's PC

Writes src/data/questions.json, papers.json, topics.json, spec.json, weighting.json and public/img/<bundle>/*.webp.
site.config.json keys used here: paperNames {"<spec>-<paperCode>": "Paper 1"}, oldSpecFlag (e.g. "not_current_spec").
"""
import argparse, base64, io, json, pathlib, re
from collections import defaultdict

def label(l):
    m = re.match(r"^0*(\d+)(.*)$", str(l))
    if not m: return str(l)
    n, rest = m.group(1), m.group(2)
    if rest and not rest.startswith("(") and not rest.startswith("."): rest = "(" + rest + ")"
    return n + rest

def extract_mcq(mt):
    t = (mt or "").replace("\u2013", "-").replace("\u2014", "-")
    tail = t.split("Marks for this question")[-1]
    found = re.findall(r"marks?\s*[-:]\s*([A-F])\b", tail)
    found += re.findall(r"[Cc]orrect answer\s*[=:]?\s*([A-F])\b", tail)
    found += re.findall(r"(?:[Aa]nswer|marks?\s+for)\s*[:=]?\s*([A-F])\b", tail)
    if not found:
        for line in [x.strip() for x in tail.splitlines() if x.strip()][1:]:
            m = re.match(r"^([A-F])\b(?:\s*(?:and|,|/)\s*([A-F])\b)?(?:\s*[-:.]|\s|$)", line)
            if m: found += [x for x in m.groups() if x]
    return list(dict.fromkeys(found))

def paper_code(p):
    parts = str(p["id"]).split("-")
    return parts[1] if len(parts) > 1 else str(p.get("paper"))

def derive_format(q):
    """Question format. Psychology/Maths banks carry `fmt`; the Economics bank carries feature codes in `sk`
    (F MCQ, F ESSAY, F LEVELS, F CALC, F DRAW, F DATAREF, F OWNCHOICE) plus command words in `cmd`."""
    if q.get("fmt"): return q["fmt"]
    sk = set(q.get("sk") or []); cmd = set(q.get("cmd") or []); m = q.get("m") or 0
    if "F MCQ" in sk or "Multiple choice" in cmd: return "Multiple choice"
    if "F ESSAY" in sk or m >= 20: return "Essay"
    if "F LEVELS" in sk or m >= 8: return "Extended response"
    if "F CALC" in sk or "Calculate" in cmd: return "Calculation"
    if "F DRAW" in sk or "Draw" in cmd: return "Diagram"
    if "Define" in cmd: return "Definition"
    return "Short answer"

def ao_text(q):
    """'AO1:4,AO2:4,AO3:8,AO4:9' -> 'AO1=4,AO2=4,AO3=8,AO4=9' (the Psychology `aot` shape the pages expect)."""
    if q.get("aot"): return q["aot"]
    ao = q.get("ao") or ""
    return ao.replace(":", "=") if re.match(r"^AO\d", ao) else None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bank", required=True); ap.add_argument("--topics", default="topics.json"); ap.add_argument("--config", default="site.config.json")
    ap.add_argument("--out", default="src/data"); ap.add_argument("--img-out", default="public/img")
    ap.add_argument("--images", action="store_true"); ap.add_argument("--only"); ap.add_argument("--quality", type=int, default=72)
    a = ap.parse_args()
    bank, out = pathlib.Path(a.bank), pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    cfg = json.loads(pathlib.Path(a.config).read_text(encoding="utf-8")) if pathlib.Path(a.config).exists() else {}
    topics_def = json.loads(pathlib.Path(a.topics).read_text(encoding="utf-8"))
    js = (bank / "data" / "index.js").read_text(encoding="utf-8"); assert js.startswith("window.QB="), "unexpected index.js"
    QB = json.loads(js[len("window.QB="):].rstrip(";\n"))
    papers = {p["id"]: p for p in QB["papers"]}
    stmt_to_slugs = defaultdict(list); flag_to_slug = {}
    for t in topics_def:
        for sid in t.get("statements", []): stmt_to_slugs[sid].append(t["slug"])
        if t.get("flag"): flag_to_slug[t["flag"]] = t["slug"]
    sec_of = {st["id"]: s["code"] for s in QB["spec"] for st in s["st"]}
    old_flag = cfg.get("oldSpecFlag", "not_current_spec")
    paper_names = cfg.get("paperNames", {})

    def pname(p):
        return paper_names.get(f"{p['spec']}-{paper_code(p)}") or p.get("name") or f"Paper {p.get('paper')}"

    stems = QB.get("stems") or {}
    skills = QB.get("skills") or {}
    questions, per_paper, weighting = [], defaultdict(list), defaultdict(lambda: defaultdict(int))
    tc = defaultdict(lambda: {"parts": 0, "marks": 0, "papers": set(), "levels": set(), "essays": 0, "mcq": 0})
    for q in QB["q"]:
        p = papers[q["p"]]
        img = q.get("qi") or q.get("mi") or ""
        bundle = p.get("prefix") or ("_".join(img.split("_")[:2]) if img else None)
        if a.only and bundle != a.only: continue
        A, C = [], []
        for sid, role in q.get("st", []):
            for s in stmt_to_slugs.get(sid, []): (A if role == "A" else C).append(s)
        slugs = list(dict.fromkeys(A or C))
        for fl, slug in flag_to_slug.items():
            if q.get(fl) or fl in (q.get("fl") or []): slugs.append(slug)
        slugs = list(dict.fromkeys(slugs))
        flags = q.get("fl") or []
        level = "AS" if p["qual"] == "AS" else "A level"
        fmt = derive_format(q)
        stem = stems.get(q.get("sid") or "")
        sk = q.get("sk") or []
        features = list(dict.fromkeys(flags + [s[2:].lower() for s in sk if s.startswith("F ")]))
        qs = [s for s in sk if s.startswith("QS")]
        rec = {"id": q["id"], "paperId": p["id"], "bundle": bundle, "series": p["series"], "year": p["year"], "spec": p["spec"],
               "paper": pname(p), "paperName": p.get("name"), "question": label(q["l"]), "marks": q["m"], "level": level,
               "difficulty": None if q.get("d") in (None, "Not rated") else q["d"], "facility": q.get("fa"),
               "topics": slugs, "statements": [s for s, r in q.get("st", []) if r == "A"], "context": [s for s, r in q.get("st", []) if r == "C"],
               "ao": q.get("ao"), "aoText": ao_text(q), "format": fmt, "commands": q.get("cmd", []), "features": features,
               "skills": [{"code": s, "text": skills.get(s, "")} for s in qs],
               "choice": q.get("ch"), "sourceLines": q.get("scr") or "",
               "mistakes": q.get("mc", []), "text": q.get("qt", ""), "msText": q.get("mt", ""), "erText": q.get("et") or "",
               "stemId": q.get("sid"), "stemText": (stem or {}).get("t", ""),
               "stemCrop": f"/img/{bundle}/{pathlib.Path(stem['img']).stem}.webp" if stem and stem.get("img") else None,
               "crop": f"/img/{bundle}/{pathlib.Path(q['qi']).stem}.webp" if q.get("qi") else None,
               "msCrop": f"/img/{bundle}/{pathlib.Path(q['mi']).stem}.webp" if q.get("mi") else None,
               "erCrop": f"/img/{bundle}/{pathlib.Path(q['ei']).stem}.webp" if q.get("ei") else None,
               "msBands": q.get("mb") or [], "lds": bool(q.get("lds")),
               "notCurrentSpec": old_flag in flags, "specNote": next((m for m in (q.get("mc") or []) if str(m).startswith("Off-spec")), ""),
               "mcqAnswers": ([q["ans"]] if q.get("ans") else extract_mcq(q.get("mt"))) if fmt == "Multiple choice" else None}
        questions.append(rec); per_paper[p["id"]].append(rec["id"])
        for s in slugs:
            t = tc[s]; t["parts"] += 1; t["marks"] += q["m"]; t["papers"].add(rec["paper"]); t["levels"].add(level)
            if q["m"] >= 16: t["essays"] += 1
            if fmt == "Multiple choice": t["mcq"] += 1
        for sid, role in q.get("st", []):
            if role == "A": weighting[p["id"]][sec_of.get(sid, "?")] += q["m"]
    (out / "questions.json").write_text(json.dumps(questions, ensure_ascii=False), encoding="utf-8")

    paper_recs = []
    for pid, p in papers.items():
        if a.only and not per_paper.get(pid): continue
        code = paper_code(p)
        paper_recs.append({"id": pid, "bundle": p.get("prefix"), "series": p["series"], "year": p["year"], "qual": p["qual"], "spec": p["spec"],
            "paperNo": code, "paper": pname(p), "name": p.get("name"), "total": p.get("total"), "source": p.get("prov"), "kind": p.get("src", "exam"),
            "files": {"qp": p.get("qp"), "ms": p.get("ms"), "er": p.get("er")},
            "slug": f"{p['series'].lower().replace(' ', '-')}-{p['spec'].lower()}-{code}", "questions": per_paper.get(pid, [])})
    paper_recs.sort(key=lambda r: (-r["year"], r["series"], r["spec"], str(r["paperNo"])))
    (out / "papers.json").write_text(json.dumps(paper_recs, ensure_ascii=False, indent=0), encoding="utf-8")

    stmt_text = {st["id"]: st for s in QB["spec"] for st in s["st"]}
    topic_recs = []
    for t in topics_def:
        c = tc[t["slug"]]; ids = t.get("statements", [])
        topic_recs.append({"slug": t["slug"], "name": t["name"], "group": t.get("group", ""), "strand": t.get("group", ""), "paper": t.get("group", ""),
            "code": t.get("code") or ", ".join(sorted({sec_of.get(i, "") for i in ids if sec_of.get(i)})), "option": t.get("option"),
            "statements": ids, "statementText": {i: stmt_text[i]["t"] for i in ids if i in stmt_text},
            "statementShort": {i: stmt_text[i].get("sh") or "" for i in ids if i in stmt_text},
            "asStatements": [i for i in ids if stmt_text.get(i, {}).get("a")], "levels": {i: stmt_text.get(i, {}).get("lv") for i in ids},
            "parts": c["parts"], "marks": c["marks"], "essays": c["essays"], "mcq": c["mcq"], "papers": sorted(c["papers"]),
            "asOrA": "AS and A level" if "AS" in c["levels"] else "A level only"})
    (out / "topics.json").write_text(json.dumps(topic_recs, ensure_ascii=False, indent=0), encoding="utf-8")

    spec_recs = [{"code": s["code"], "title": s["title"], "paper": s.get("paper"), "option": s.get("opt"), "area": s.get("area"),
                  "theme": s.get("theme"), "aLevelOnly": bool(s.get("al")),
                  "topic": next((t["slug"] for t in topics_def if any(st["id"] in t.get("statements", []) for st in s["st"])), None),
                  "statements": [{"id": st["id"], "short": st.get("sh") or "", "text": st["t"], "guidance": st.get("g") or "", "level": st.get("lv") or "",
                                  "points": st.get("pts") or [], "page": st.get("pg"),
                                  "aLevelPart": st.get("ap") or "", "as": bool(st.get("a")) or (st.get("lv") or "").startswith("AS"), "topics": stmt_to_slugs.get(st["id"], [])} for st in s["st"]]} for s in QB["spec"]]
    (out / "spec.json").write_text(json.dumps(spec_recs, ensure_ascii=False, indent=0), encoding="utf-8")
    (out / "weighting.json").write_text(json.dumps({"areas": {s["code"]: s["title"] for s in QB["spec"]}, "byPaper": {k: dict(v) for k, v in weighting.items()}}, ensure_ascii=False), encoding="utf-8")
    unmapped = sum(1 for x in questions if not x["topics"])
    mcq = [x for x in questions if x["format"] == "Multiple choice"]
    print(f"questions {len(questions)} ({unmapped} without a topic), papers {len(paper_recs)}, topics {len(topic_recs)}, MCQ answers {sum(1 for x in mcq if x['mcqAnswers'])}/{len(mcq)} -> {out}")

    if a.images:
        from PIL import Image
        n = 0
        for f in sorted((bank / "data" / "img").glob("*.js")):
            if a.only and f.stem != a.only: continue
            m = re.match(r'QBIMG_LOADED\("([^"]+)",(\{.*\})\);?\s*$', f.read_text(encoding="utf-8"), re.S)
            if not m: print("skip", f.name); continue
            dest = pathlib.Path(a.img_out) / f.stem; dest.mkdir(parents=True, exist_ok=True)
            for name, data in json.loads(m.group(2)).items():
                target = dest / (pathlib.Path(name).stem + ".webp")
                if not target.exists():
                    Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1]))).convert("RGB").save(target, "WEBP", quality=a.quality, method=6)
                n += 1
            print(f"{f.stem}: done")
        print(f"images: {n}")

if __name__ == "__main__":
    main()
