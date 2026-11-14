"""Prepare the open BPO orders authorized by a single Setup Folders click."""
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
from bpo_reports import run, verified
from bpo_notes import fill
from export_photos import property_folder

HERE = Path(__file__).resolve().parent
LOCK = threading.Lock()
STATE = {"running": False, "message": "Ready", "completed": 0, "skipped": 0, "issues": []}


def already_prepared(folder, order):
    status = folder / ("MLS report status - " + order["id"] + ".txt")
    if status.exists() and verified(status.read_text(encoding="utf-8-sig"), folder):
        return True
    # Older manually prepared folders have no completion receipt. Validate their
    # documents and populated notes before recognizing them as already prepared.
    from pypdf import PdfReader
    import zipfile
    import xml.etree.ElementTree as ET
    groups = {
        "mls": list(folder.glob("*MLS*.pdf")),
        "imapp": list(folder.glob("*[iI][mM]app*.pdf")),
        "rpr": list(folder.glob("*[nN]eighborhood*.pdf")),
    }
    if not all(groups.values()) or not (folder / "BPO Notes.xlsx").exists():
        return False
    import re
    number = order["address"].split()[0]
    zip_match = re.search(r"\b\d{5}(?:-\d{4})?\s*$", order["address"])
    if not zip_match:
        return False
    zip_code = zip_match[0][:5]
    for group, paths in groups.items():
        for path in paths:
            pdf = PdfReader(path, strict=True)
            content = "".join(page.extract_text() or "" for page in pdf.pages)
            words = re.sub(r"[^a-z0-9]", "", content.casefold())
            street = re.sub(r"[^a-z0-9]", "", " ".join(order["address"].split()[:3]).casefold())
            if zip_code not in content or (group != "rpr" and street not in words):
                return False
    with zipfile.ZipFile(folder / "BPO Notes.xlsx") as book:
        root = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
        cells = {c.get("r"): "".join(c.itertext()) for c in root.findall(".//{*}c")}
        if not all(cells.get(c) for c in ("A1", "B3", "B4", "D4", "G4", "J4")):
            return False
        if number not in cells["A1"]:
            return False
    manifest = {"mls": [p.name for p in groups["mls"]],
                "imapp": groups["imapp"][0].name, "rpr": groups["rpr"][0].name}
    status.write_text("COMPLETE\nExisting setup verified.\n" + json.dumps(manifest), encoding="utf-8")
    return True


def prepare_notes(folder, order):
    target = folder / "BPO Notes.xlsx"
    if target.exists():
        return
    # The template lives on the redirected desktop configured for this account.
    import winreg
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders") as key:
        desktop = Path(os.path.expandvars(winreg.QueryValueEx(key, "Desktop")[0]))
    with tempfile.NamedTemporaryFile(dir=folder, suffix=".xlsx", delete=False) as temp:
        staged = Path(temp.name)
    try:
        shutil.copyfile(desktop / "BPO Notes.xlsx", staged)
        kind = "Desktop" if order["kind"] == "Desktop BPO" else ("Interior" if order["kind"] in ("Int BPO", "Interior BPO") else "Exterior")
        fill(staged, {"address": order["address"], "client": order["client"], "type": kind})
        if not target.exists():
            staged.rename(target)
    finally:
        staged.unlink(missing_ok=True)


def batch(orders):
    try:
        requests = HERE / "report-requests"
        requests.mkdir(exist_ok=True)
        for order in orders:
            try:
                folder = property_folder(order["folder_url"])
                if already_prepared(folder, order):
                    STATE["skipped"] += 1
                    continue
                STATE["message"] = "Preparing " + order["address"]
                prepare_notes(folder, order)
                request = requests / (order["id"] + ".json")
                request.write_text(json.dumps(dict(order, folder=str(folder),
                    notes_helper=str(HERE / "bpo_notes.py"))), encoding="utf-8")
                run(request)
                status = folder / ("MLS report status - " + order["id"] + ".txt")
                if status.exists() and verified(status.read_text(encoding="utf-8-sig"), folder):
                    STATE["completed"] += 1
                else:
                    STATE["issues"].append(order["address"] + " — setup incomplete. See the report status in its folder.")
            except Exception as exc:
                STATE["issues"].append(order["address"] + " — " + str(exc))
        STATE["message"] = "Setup finished"
    finally:
        STATE["running"] = False
        LOCK.release()


def start(orders):
    if not LOCK.acquire(blocking=False):
        return STATE
    STATE.update(running=True, message="Checking open BPO folders", completed=0, skipped=0, issues=[])
    threading.Thread(target=batch, args=(orders,), daemon=True).start()
    return STATE
