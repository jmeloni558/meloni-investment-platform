"""Fill blank subject cells in a property copy without repackaging Excel drawings."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile
import json
import os
import re
import sys
import tempfile

FIELDS = {"address":"A1", "client":"B3", "type":"B4", "bed_bath_garage":"D4",
          "sqft":"G4", "year":"J4", "pool":"J7", "lot":"G10", "zestimate":"B13",
          "rent":"B14", "development":"B16", "sale_date":"B17", "sale_amount":"B18"}
SHEET = "xl/worksheets/sheet1.xml"


def fill(path, values):
    path = Path(path).resolve(strict=True)
    if not values.keys() <= FIELDS.keys():
        raise ValueError("Unexpected field")
    before = path.stat()
    with ZipFile(path) as source:
        xml = source.read(SHEET).decode("utf-8")
        if '<mergeCell ref="A1:R1"/>' not in xml:
            raise ValueError("Unrecognized BPO Notes header")
        original = xml
        for field, value in values.items():
            if value is None or value == "":
                continue
            cell = FIELDS[field]
            pattern = rf'(<c r="{cell}"(?: s="\d+")?)/>'
            if isinstance(value, (int, float)):
                content = f"><v>{value}</v></c>"
            else:
                content = f' t="inlineStr"><is><t>{escape(str(value))}</t></is></c>'
            xml, count = re.subn(pattern, lambda m: m[1] + content, xml, count=1)
            if not count and f'<c r="{cell}"' not in xml:
                raise ValueError(f"Missing subject cell {cell}")
        if xml == original:
            return
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as tmp:
            staged = Path(tmp.name)
        try:
            with ZipFile(staged, "w") as dest:
                for item in source.infolist():
                    dest.writestr(item, xml.encode() if item.filename == SHEET else source.read(item))
            with ZipFile(staged) as dest:
                if dest.testzip() or dest.read(SHEET).decode() != xml:
                    raise ValueError("Workbook verification failed")
            source.close()
            if path.stat().st_mtime_ns != before.st_mtime_ns or path.stat().st_size != before.st_size:
                raise RuntimeError("Workbook was edited during preparation")
            os.replace(staged, path)
        finally:
            staged.unlink(missing_ok=True)


if __name__ == "__main__":
    path, address, client, kind = sys.argv[1:5]
    types = {"Int BPO":"Interior", "Interior BPO":"Interior", "Ext BPO":"Exterior",
             "Exterior BPO":"Exterior", "Desktop BPO":"Desktop"}
    extra = json.loads(Path(sys.argv[5]).read_text(encoding="utf-8-sig")) if len(sys.argv) > 5 else {}
    fill(path, dict(extra, address=address, client=client, type=types[kind]))
