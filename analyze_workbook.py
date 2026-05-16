import json
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


def col_to_num(col):
    n = 0
    for ch in col:
        n = n * 26 + ord(ch.upper()) - 64
    return n


def parse_cell_ref(ref):
    m = re.match(r"\$?([A-Z]{1,3})\$?(\d+)", ref or "")
    if not m:
        return None
    return col_to_num(m.group(1)), int(m.group(2))


def parse_dim(dim):
    if not dim:
        return None
    parts = dim.split(":")
    a = parse_cell_ref(parts[0])
    b = parse_cell_ref(parts[-1])
    if not a or not b:
        return None
    return {"range": dim, "rows": b[1] - a[1] + 1, "cols": b[0] - a[0] + 1}


def norm_formula(f):
    f = f or ""
    f = re.sub(r"'[^']+'!", "SHEET!", f)
    f = re.sub(r"[A-Z]{1,3}\$?\d+", "CELL", f)
    f = re.sub(r"\$?[A-Z]{1,3}:\$?[A-Z]{1,3}", "COL:COL", f)
    f = re.sub(r"\d+", "N", f)
    return f[:500]


def get_text(el):
    return "".join(el.itertext()) if el is not None else ""


with zipfile.ZipFile(XLSX) as z:
    names = z.namelist()
    wb = ET.fromstring(z.read("xl/workbook.xml"))
    rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.attrib["Id"]: r.attrib["Target"] for r in rels}

    sheets = []
    for s in wb.findall("main:sheets/main:sheet", NS):
        rid = s.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
        target = relmap[rid].lstrip("/")
        if not target.startswith("xl/"):
            target = "xl/" + target
        sheets.append({"name": s.attrib["name"], "path": target})

    shared_strings = 0
    if "xl/sharedStrings.xml" in names:
        sst = ET.fromstring(z.read("xl/sharedStrings.xml"))
        shared_strings = int(sst.attrib.get("count", "0"))

    style_count = None
    dxf_count = None
    if "xl/styles.xml" in names:
        styles = ET.fromstring(z.read("xl/styles.xml"))
        cell_xfs = styles.find("main:cellXfs", NS)
        dxfs = styles.find("main:dxfs", NS)
        style_count = int(cell_xfs.attrib.get("count", len(cell_xfs))) if cell_xfs is not None else 0
        dxf_count = int(dxfs.attrib.get("count", len(dxfs))) if dxfs is not None else 0

    summary = {
        "file": str(XLSX),
        "file_size_bytes": XLSX.stat().st_size,
        "shared_string_count": shared_strings,
        "cell_style_count": style_count,
        "differential_style_count": dxf_count,
        "sheet_count": len(sheets),
        "sheets": [],
    }

    volatile_re = re.compile(r"\b(NOW|TODAY|RAND|RANDBETWEEN|OFFSET|INDIRECT|CELL|INFO)\s*\(", re.I)
    whole_col_re = re.compile(r"(?<![A-Z0-9_])\$?[A-Z]{1,3}:\$?[A-Z]{1,3}(?![A-Z0-9_])")
    full_row_re = re.compile(r"(?<![A-Z0-9_])\$?\d+:\$?\d+(?![A-Z0-9_])")
    func_re = re.compile(r"\b([A-Z][A-Z0-9\.]*)\s*\(", re.I)

    for sh in sheets:
        xml = z.read(sh["path"])
        root = ET.fromstring(xml)
        dim = root.find("main:dimension", NS)
        sheet_data = root.find("main:sheetData", NS)
        rows = sheet_data.findall("main:row", NS) if sheet_data is not None else []
        cells = []
        formula_cells = 0
        formulas_with_text = []
        formula_types = Counter()
        shared_formula_refs = {}
        max_row = 0
        max_col = 0
        styled_blank_cells = 0
        style_ids = Counter()
        row_with_cells_count = 0
        cells_with_values = 0

        for row in rows:
            row_cells = row.findall("main:c", NS)
            if row_cells:
                row_with_cells_count += 1
            for c in row_cells:
                ref = c.attrib.get("r", "")
                parsed = parse_cell_ref(ref)
                if parsed:
                    max_col = max(max_col, parsed[0])
                    max_row = max(max_row, parsed[1])
                if "s" in c.attrib:
                    style_ids[c.attrib["s"]] += 1
                f = c.find("main:f", NS)
                v = c.find("main:v", NS)
                is_el = c.find("main:is", NS)
                has_value = v is not None or is_el is not None
                if has_value:
                    cells_with_values += 1
                elif "s" in c.attrib:
                    styled_blank_cells += 1
                if f is not None:
                    formula_cells += 1
                    txt = get_text(f)
                    formula_types[f.attrib.get("t", "normal")] += 1
                    if f.attrib.get("ref"):
                        shared_formula_refs[ref] = f.attrib.get("ref")
                    if txt:
                        formulas_with_text.append((ref, txt, f.attrib))

        funcs = Counter()
        volatiles = Counter()
        whole_cols = Counter()
        full_rows = Counter()
        normalized = Counter()
        formula_lengths = []
        samples = []
        for ref, f, attrs in formulas_with_text:
            formula_lengths.append(len(f))
            normalized[norm_formula(f)] += 1
            funcs.update(m.group(1).upper() for m in func_re.finditer(f))
            volatiles.update(m.group(1).upper() for m in volatile_re.finditer(f))
            if whole_col_re.search(f):
                whole_cols[f[:250]] += 1
            if full_row_re.search(f):
                full_rows[f[:250]] += 1
            if len(samples) < 12:
                samples.append({"cell": ref, "formula": f[:350], "attrs": attrs})

        cf_count = 0
        cf_ranges = []
        for cf in root.findall("main:conditionalFormatting", NS):
            cf_count += len(cf.findall("main:cfRule", NS))
            if len(cf_ranges) < 20:
                cf_ranges.append(cf.attrib.get("sqref", ""))

        data_validation_count = 0
        data_validation_ranges = []
        dvs = root.find("main:dataValidations", NS)
        if dvs is not None:
            data_validation_count = int(dvs.attrib.get("count", len(dvs)))
            for dv in dvs.findall("main:dataValidation", NS)[:20]:
                data_validation_ranges.append(dv.attrib.get("sqref", ""))

        merges = root.find("main:mergeCells", NS)
        merge_count = int(merges.attrib.get("count", len(merges))) if merges is not None else 0

        tables = []
        tbls = root.find("main:tableParts", NS)
        table_part_count = int(tbls.attrib.get("count", len(tbls))) if tbls is not None else 0

        sheet_summary = {
            "name": sh["name"],
            "path": sh["path"],
            "xml_size_bytes": len(xml),
            "dimension": parse_dim(dim.attrib.get("ref")) if dim is not None else None,
            "actual_max_row": max_row,
            "actual_max_col": max_col,
            "row_elements_with_cells": row_with_cells_count,
            "cell_elements": len(sheet_data.findall('.//main:c', NS)) if sheet_data is not None else 0,
            "cells_with_values": cells_with_values,
            "styled_blank_cells": styled_blank_cells,
            "formula_cells": formula_cells,
            "formulas_with_text": len(formulas_with_text),
            "formula_types": formula_types.most_common(),
            "top_functions": funcs.most_common(20),
            "volatile_functions": volatiles.most_common(),
            "whole_column_formula_examples": whole_cols.most_common(10),
            "full_row_formula_examples": full_rows.most_common(10),
            "top_repeated_formula_shapes": normalized.most_common(10),
            "formula_length": {
                "max": max(formula_lengths) if formula_lengths else 0,
                "avg": round(sum(formula_lengths) / len(formula_lengths), 1) if formula_lengths else 0,
            },
            "sample_formulas": samples,
            "conditional_format_rule_count": cf_count,
            "conditional_format_ranges": cf_ranges,
            "data_validation_count": data_validation_count,
            "data_validation_ranges": data_validation_ranges,
            "merge_count": merge_count,
            "table_part_count": table_part_count,
            "top_style_ids": style_ids.most_common(10),
        }
        summary["sheets"].append(sheet_summary)

    parts = []
    for n in names:
        if n.startswith("xl/worksheets/") or n in ("xl/calcChain.xml", "xl/sharedStrings.xml", "xl/styles.xml"):
            parts.append((n, len(z.read(n))))
    summary["largest_relevant_zip_parts"] = sorted(parts, key=lambda x: x[1], reverse=True)[:20]

print(json.dumps(summary, indent=2))
