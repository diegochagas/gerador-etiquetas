import re
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

XLSX = Path(r"C:\Users\droch\Downloads\Pru Account Management & Roster v2.xlsx")
NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

def col(ref):
    m = re.match(r"\$?([A-Z]{1,3})", ref or "")
    return m.group(1) if m else "?"

def row(ref):
    m = re.match(r"\$?[A-Z]{1,3}\$?(\d+)", ref or "")
    return int(m.group(1)) if m else 0

def formula_text(el):
    return "".join(el.itertext()) if el is not None else ""

with zipfile.ZipFile(XLSX) as z:
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels}
    calc = wb.find("main:calcPr", NS)
    print("CALC:", calc.attrib if calc is not None else None)
    roster_path = None
    for s in wb.findall("main:sheets/main:sheet", NS):
        if s.attrib["name"] == "Roster":
            rid = s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = relmap[rid].lstrip("/")
            roster_path = target if target.startswith("xl/") else "xl/" + target
    root = ET.fromstring(z.read(roster_path))
    cells = root.findall(".//main:c", NS)
    formulas = []
    for c in cells:
        f = c.find("main:f", NS)
        if f is not None:
            formulas.append((c.attrib.get("r", ""), formula_text(f), f.attrib))

    print("ROSTER_FORMULA_CELLS", len(formulas))
    print("FORMULAS_BY_COLUMN", sorted(Counter(col(r) for r, _, __ in formulas).items()))
    print("FORMULAS_BY_ROW_BANDS", Counter(
        "1-3" if row(r) <= 3 else "4-238" if row(r) <= 238 else "239+"
        for r, _, __ in formulas
    ))

    whole_col = [x for x in formulas if re.search(r"(?<![A-Z0-9_])\$?[A-Z]{1,3}:\$?[A-Z]{1,3}(?![A-Z0-9_])", x[1])]
    print("WHOLE_COLUMN_FORMULA_CELLS", len(whole_col))
    print("WHOLE_COLUMN_BY_COLUMN", sorted(Counter(col(r) for r, _, __ in whole_col).items()))

    refs = Counter()
    for _, f, __ in formulas:
        for sh, c in re.findall(r"('(?:[^']|'')+'|[A-Za-z0-9_ ]+)?!?\$?([A-Z]{1,3}):\$?[A-Z]{1,3}", f):
            key = (sh or "same sheet").strip("'") + "!" + c + ":" + c
            refs[key] += 1
    print("TOP_WHOLE_COLUMN_REFS", refs.most_common(25))

    print("REPRESENTATIVE_BY_COLUMN")
    seen = set()
    for r, f, a in formulas:
        c = col(r)
        if c not in seen:
            print(c, r, f.replace("\n", " ")[:280])
            seen.add(c)

    cf_ranges = []
    full_cf = []
    for cf in root.findall("main:conditionalFormatting", NS):
        sqref = cf.attrib.get("sqref", "")
        rules = len(cf.findall("main:cfRule", NS))
        cf_ranges.append((sqref, rules))
        if "1048576" in sqref:
            full_cf.append((sqref, rules))
    print("CONDITIONAL_FORMAT_RULES", sum(r for _, r in cf_ranges), "RANGES", len(cf_ranges))
    print("CONDITIONAL_FORMATS_TO_LAST_ROW", len(full_cf))
    for sqref, rules in full_cf[:30]:
        print("CF_FULL", rules, sqref[:500])

    rel_path = roster_path.replace("worksheets/", "worksheets/_rels/") + ".rels"
    if rel_path in z.namelist():
        relroot = ET.fromstring(z.read(rel_path))
        types = Counter(r.attrib.get("Type", "").split("/")[-1] for r in relroot)
        print("ROSTER_RELATIONSHIPS", types)

    if "xl/calcChain.xml" in z.namelist():
        cr = ET.fromstring(z.read("xl/calcChain.xml"))
        print("CALCCHAIN_ENTRIES", len(cr.findall("main:c", NS)))
