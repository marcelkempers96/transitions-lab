"""Mineral flows tools. One file, three commands, run from the folder holding data.json and mineral-flows.html.

  python3 tools.py check                  House-style and data integrity checks (exit 1 on failure)
  python3 tools.py sync                   Copy data.json into the inline data block of mineral-flows.html
  python3 tools.py baci --year 2024 --release 202601 [--top 0.95]
                                          Build corridors in tonnes of contained metal from CEPII BACI HS6 data

BACI method follows Nansai et al. (2014): HS6 trade quantity (tonnes) x metal-content coefficient,
aggregated to exporter-importer pairs per mineral and stage. Download BACI manually after accepting
the CEPII licence (https://www.cepii.fr/CEPII/en/bdd_modele/bdd_modele_item.asp?id=37) into ./raw/:
  raw/BACI_HS17_Y{year}_V{release}.csv   columns t,i,j,k,v,q
  raw/country_codes_V{release}.csv
Output goes to flows.generated.json for manual review before it replaces the flows section of data.json.
"""
import argparse, collections, csv, json, pathlib, re, sys

HERE = pathlib.Path(__file__).resolve().parent
DATA = HERE / "data.json"
HTML = HERE / "mineral-flows.html"

# HS6 product map: mineral, stage, processed, metal fraction, confidence, note.
# Stoichiometric fractions are exact; ore and concentrate grades are typical assumptions to check per exporter.
HS = {
    # mineral, stage, processed, metal fraction, confidence, note
    "253090": ("lithium", "ore/concentrate", False, 0.028, "low", "Residual code; spodumene SC6 at ~6% Li2O. Contains non-lithium minerals, so filter by exporter (AUS, ZWE, BRA)."),
    "283691": ("lithium", "chemical", True, 0.188, "high", "Lithium carbonate, stoichiometric"),
    "282520": ("lithium", "chemical", True, 0.165, "high", "Lithium hydroxide monohydrate, stoichiometric"),
    "260500": ("cobalt", "ore/concentrate", False, 0.10, "low", "Grade varies"),
    "282200": ("cobalt", "intermediate", False, 0.33, "medium", "Cobalt oxides and hydroxides; DRC hydroxide ~30 to 35% Co"),
    "810520": ("cobalt", "refined", True, 0.95, "medium", "Mattes, intermediates and unwrought cobalt; mixed"),
    "260400": ("nickel", "ore/concentrate", False, 0.015, "medium", "Laterite ore ~1.2 to 1.8% Ni"),
    "720260": ("nickel", "intermediate", False, 0.12, "medium", "Ferronickel and nickel pig iron"),
    "750110": ("nickel", "intermediate", False, 0.70, "medium", "Nickel matte"),
    "750120": ("nickel", "intermediate", False, 0.40, "medium", "Oxide sinters and intermediates incl. MHP"),
    "750210": ("nickel", "refined", True, 0.998, "high", "Unwrought nickel, not alloyed"),
    "283324": ("nickel", "chemical", True, 0.22, "high", "Nickel sulphate hexahydrate, stoichiometric"),
    "260300": ("copper", "ore/concentrate", False, 0.27, "medium", "Concentrate ~25 to 30% Cu"),
    "740200": ("copper", "intermediate", False, 0.985, "high", "Blister and anodes"),
    "740311": ("copper", "refined", True, 1.0, "high", "Cathodes"),
    "250410": ("graphite", "ore/concentrate", False, 0.94, "medium", "Natural graphite powder or flakes, product tonnes"),
    "380110": ("graphite", "refined", True, 1.0, "medium", "Artificial graphite"),
    "280530": ("rare_earths", "refined", True, 1.0, "medium", "Rare earth metals"),
    "284690": ("rare_earths", "chemical", True, 0.70, "low", "Rare earth compounds, REO basis approximate"),
    "850511": ("rare_earths", "component", True, 0.30, "low", "Metal permanent magnets, ~30% REE by mass"),
    "260200": ("manganese", "ore/concentrate", False, 0.40, "medium", "Ore and concentrate ~35 to 48% Mn"),
    "283329": ("manganese", "chemical", True, 0.325, "low", "Other sulphates; includes MnSO4.H2O (32.5% Mn) and others"),
    "711011": ("pgm", "refined", True, 1.0, "high", "Platinum, unwrought or powder"),
    "711021": ("pgm", "refined", True, 1.0, "high", "Palladium, unwrought or powder"),
}


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))

def cmd_check(_):
    fails = []
    for p in [DATA, HTML] + list(HERE.glob("*.md")) + list(HERE.rglob("*.tsx")) + list(HERE.rglob("*.astro")):
        if not p.exists() or "node_modules" in p.parts: continue
        t = p.read_text(encoding="utf-8")
        for ch, nm in (("\u2014", "em dash"), ("\u2013", "en dash")):
            if t.count(ch): fails.append(f"{p.name}: {t.count(ch)} {nm}(es)")
    allowed = {"var(--white)", "var(--black)", "var(--orange)", "inherit", "#fff", "#ffffff", "#000", "#000000", "#ff9a1f", "currentcolor", "transparent"}
    for p in [HTML] + list(HERE.rglob("*.css")):
        if not p.exists() or "node_modules" in p.parts: continue
        for m in re.finditer(r"(?<![-\w])color\s*:\s*([^;}\"]+)", p.read_text(encoding="utf-8")):
            v = m.group(1).strip().lower()
            if v not in allowed: fails.append(f"{p.name}: text colour {v} is not white, black or orange")
    d = load()
    countries = {c["iso3"] for c in d["countries"]["countries"]}
    minerals = d["minerals"]["minerals"]; mids = {m["id"] for m in minerals}
    bib = d["bibliography"]["studies"]; bib_ids = {b["id"] for b in bib}
    for m in minerals:
        for s, st in m["stages"].items():
            tot = sum(st["shares"].values())
            if abs(tot - 100) > 0.5: fails.append(f"{m['id']} {s}: shares sum to {tot}")
            fails += [f"{m['id']} {s}: unknown country {i}" for i in st["shares"] if i != "OTHER" and i not in countries]
        fails += [f"{m['id']}: unknown bib id {b}" for b in m.get("bib", []) if b not in bib_ids]
    for f in d["flows"]["flows"]:
        fails += [f"flow {f['id']}: unknown country {i}" for i in (f["source"], f["target"]) if i not in countries]
        if f["mineral"] not in mids: fails.append(f"flow {f['id']}: unknown mineral")
        if f.get("weight") is not None and not 1 <= f["weight"] <= 5: fails.append(f"flow {f['id']}: weight out of range")
    for c in d["corridors"]["corridors"]:
        fails += [f"corridor {c['id']}: unknown country {i}" for i in c["countries"] if i not in countries]
        fails += [f"corridor {c['id']}: unknown bib id {b}" for b in c.get("bib", []) if b not in bib_ids]
    for p in d["policies"]["policies"]:
        if p["country"] not in countries: fails.append(f"policy {p['id']}: unknown country")
        fails += [f"policy {p['id']}: unknown bib id {b}" for b in p.get("bib", []) if b not in bib_ids]
    fails += [f"bib {b['id']}: missing URL" for b in bib if not b.get("url", "").startswith("http")]
    if HTML.exists():
        h = HTML.read_text(encoding="utf-8")
        m = re.search(r"/\*DATA-START\*/window\.MF_DATA = (.*?);/\*DATA-END\*/", h, re.S)
        if not m: fails.append("mineral-flows.html: inline data markers missing")
        elif json.loads(m.group(1).replace("<\\/", "</")) != d: fails.append("mineral-flows.html: inline data is out of date, run: python3 tools.py sync")
    unverified = [b["id"] for b in bib if not b["check"].startswith("verified")]
    print(f"Checked {len(minerals)} minerals, {len(d['flows']['flows'])} flows, {len(d['corridors']['corridors'])} corridors, {len(d['policies']['policies'])} policies, {len(bib)} studies.")
    print(f"Studies still to confirm before citing on the site: {len(unverified)}")
    if fails:
        print(f"{len(fails)} failure(s):"); [print("  " + x) for x in fails]; sys.exit(1)
    print("All checks passed.")

def cmd_sync(_):
    h = HTML.read_text(encoding="utf-8")
    blob = json.dumps(load(), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    new, n = re.subn(r"/\*DATA-START\*/.*?/\*DATA-END\*/", lambda _: f"/*DATA-START*/window.MF_DATA = {blob};/*DATA-END*/", h, flags=re.S)
    assert n == 1, "data markers not found exactly once"
    HTML.write_text(new, encoding="utf-8"); print("mineral-flows.html updated from data.json")

def cmd_baci(a):
    raw = HERE / "raw"
    codes = {}
    with open(raw / f"country_codes_V{a.release}.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh): codes[r["country_code"]] = r["country_iso3"]
    known = {c["iso3"] for c in load()["countries"]["countries"]}
    agg = collections.defaultdict(float)
    with open(raw / f"BACI_HS17_Y{a.year}_V{a.release}.csv", newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            k = r["k"].zfill(6)
            if k not in HS: continue
            q = r["q"].strip()
            if not q or q == "NA": continue
            mineral, stage, processed, frac, conf, _ = HS[k]
            src, dst = codes.get(r["i"]), codes.get(r["j"])
            if src and dst: agg[(mineral, stage, processed, src, dst)] += float(q) * frac
    by_ms = collections.defaultdict(list)
    for key, t in agg.items(): by_ms[key[:3]].append((key, t))
    out, missing = [], set()
    for rows in by_ms.values():
        rows.sort(key=lambda x: -x[1]); total = sum(t for _, t in rows); run = 0
        for (mineral, stage, processed, src, dst), t in rows:
            if run / total >= a.top: break
            run += t
            missing.update({src, dst} - known)
            out.append({"id": f"{mineral}-{src}-{dst}-{stage}", "source": src, "target": dst, "mineral": mineral, "form": stage,
                        "processed": processed, "tonnes": round(t), "share_of_mineral_trade": round(t / total, 4),
                        "weight": None, "confidence": "high", "note": f"BACI HS17 {a.year} V{a.release}"})
    meta = {"status": "generated", "source": f"CEPII BACI HS17 {a.year} V{a.release}",
            "method": "HS6 quantity x metal-content coefficient (Nansai et al. 2014)", "countries_to_add": sorted(missing)}
    (HERE / "flows.generated.json").write_text(json.dumps({"meta": meta, "flows": out}, indent=1))
    print(f"{len(out)} corridors written to flows.generated.json. Add these countries to data.json first: {sorted(missing)}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check"); sub.add_parser("sync")
    b = sub.add_parser("baci"); b.add_argument("--year", type=int, required=True); b.add_argument("--release", required=True); b.add_argument("--top", type=float, default=0.95)
    a = ap.parse_args()
    {"check": cmd_check, "sync": cmd_sync, "baci": cmd_baci}[a.cmd](a)
