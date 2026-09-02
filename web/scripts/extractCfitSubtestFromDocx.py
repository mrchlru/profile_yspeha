"""Извлекает картинки из docx CFIT в public/audit/cfit/subXX.

Ожидаемая структура Word: сначала 2 примера, затем задания субтеста.
Использование:
  python web/scripts/extractCfitSubtestFromDocx.py "path/CFIT 1.docx" sub01 12
"""

from __future__ import annotations

import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

_NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships"


def _media_paths_in_order(z: zipfile.ZipFile) -> list[str]:
    rels_root = ET.fromstring(z.read("word/_rels/document.xml.rels"))
    rid_to_target = {
        rel.get("Id"): rel.get("Target")
        for rel in rels_root.findall(f"{{{_NS_REL}}}Relationship")
        if rel.get("Id") and rel.get("Target")
    }
    doc_xml = z.read("word/document.xml").decode("utf-8")
    ordered_rids = re.findall(r'r:embed="(rId\d+)"', doc_xml)
    paths: list[str] = []
    for rid in ordered_rids:
        target = rid_to_target.get(rid, "")
        if target.startswith("media/"):
            paths.append(target)
    return paths


def extract(docx_path: Path, sub_dir: str, item_count: int, example_count: int = 2) -> None:
    repo_root = Path(__file__).resolve().parents[2]
    out_dir = repo_root / "web" / "public" / "audit" / "cfit" / sub_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(docx_path) as z:
        media = _media_paths_in_order(z)
        expected = example_count + item_count
        if len(media) != expected:
            raise SystemExit(
                f"Ожидалось {expected} картинок (примеров {example_count} + заданий {item_count}), "
                f"в docx — {len(media)}"
            )
        for ei in range(example_count):
            data = z.read("word/" + media[ei])
            name = f"example-{ei + 1:02d}.jpg"
            (out_dir / name).write_bytes(data)
            print(f"wrote {sub_dir}/{name}")
        for ii in range(item_count):
            data = z.read("word/" + media[example_count + ii])
            name = f"item-{ii + 1:02d}.jpg"
            (out_dir / name).write_bytes(data)
            print(f"wrote {sub_dir}/{name}")


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit(
            "Usage: extractCfitSubtestFromDocx.py <docx> <sub_dir> <item_count> [example_count=2]"
        )
    docx = Path(sys.argv[1])
    sub_dir = sys.argv[2]
    items = int(sys.argv[3])
    examples = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    extract(docx, sub_dir, items, examples)


if __name__ == "__main__":
    main()
