"""Open the synced BPO directory named by a PropertyThesis desktop link."""
import base64
import json
import os
import re
import sys
import winreg
from pathlib import Path
from urllib.parse import parse_qs, urlsplit


def resolve_folder(uri, root, library_prefix):
    match = re.fullmatch(r"pt-order-folder:([A-Za-z0-9_-]{1,12000})/?", uri, re.I)
    if not match:
        raise ValueError("Invalid folder link.")
    token = match[1]
    path = base64.urlsafe_b64decode(token + "=" * (-len(token) % 4)).decode("utf-8")
    prefix = library_prefix.rstrip("/") + "/"
    if not path.casefold().startswith(prefix.casefold()):
        raise ValueError("This folder is outside your synced BPO library.")
    parts = path[len(prefix):].split("/")
    if any(not p or p.endswith((" ", ".")) or re.search(r'[<>:"\\|?*\x00-\x1f]', p)
           or os.path.isreserved(p) for p in parts):
        raise ValueError("Invalid property folder path.")
    target = root.joinpath(*parts).resolve(strict=True)
    if not target.is_relative_to(root) or not target.is_dir():
        raise ValueError("The synced property folder could not be found.")
    return target


def main(uri):
    settings = json.loads(Path(__file__).with_name("settings.json").read_text(encoding="utf-8-sig"))
    root = Path(settings["root"]).resolve(strict=True)
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Microsoft\OneDrive\Accounts") as accounts:
        for i in range(winreg.QueryInfoKey(accounts)[0]):
            name = winreg.EnumKey(accounts, i)
            if not name.startswith("Business"):
                continue
            with winreg.OpenKey(accounts, name) as account:
                drive = Path(winreg.QueryValueEx(account, "UserFolder")[0]).resolve()
                if not root.is_relative_to(drive):
                    continue
                site = urlsplit(winreg.QueryValueEx(account, "ServiceEndpointUri")[0]).path.removesuffix("/_api")
                prefix = site + "/Documents/" + root.relative_to(drive).as_posix()
                target = resolve_folder(uri, root, prefix)
                os.startfile(str(target), "explore")
                return
    raise ValueError("The synced OneDrive account for this property folder is unavailable.")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("Invalid property folder link.")
        main(sys.argv[1])
    except (OSError, ValueError, KeyError) as error:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, str(error), "PropertyThesis property folder", 0x10)
