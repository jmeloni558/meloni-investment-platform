"""Package the shared menu with the existing client importers."""
from html.parser import HTMLParser
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import json
import re

SOURCE = Path(__file__).resolve().parent
HUB = SOURCE / "propertythesis"


class Menu(HTMLParser):
    def __init__(self):
        super().__init__()
        self.forms = {}
        self.path = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.path = dict(attrs)["href"]
            self.forms[self.path] = []

    def handle_endtag(self, tag):
        if tag == "a":
            self.path = None

    def handle_data(self, text):
        if self.path and text.strip():
            self.forms[self.path].append(text.strip())


def build():
    manifest = json.loads((HUB / "manifest.json").read_text())
    menu = Menu()
    menu.feed((HUB / "menu.html").read_text(encoding="utf-8"))
    target = SOURCE.parents[1] / "assets" / "portal-import" / f"PropertyThesis-Importers-{manifest['version']}.zip"
    with ZipFile(target, "w", ZIP_DEFLATED) as archive:
        for asset in HUB.rglob("*"):
            if asset.is_file():
                archive.write(asset, asset.relative_to(HUB))
        for route, label in menu.forms.items():
            page = SOURCE / route
            html = page.read_text(encoding="utf-8")
            title = " — ".join(label)
            html = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", html)
            html, count = re.subn(r"<h[12]>.*?</h[12]>", f'<a href="../menu.html">‹ All importers</a><h2>{title}</h2>', html, count=1)
            assert count == 1, route
            archive.writestr(route, html)
            for script in page.parent.glob("*.js"):
                archive.write(script, script.relative_to(SOURCE))
    print(target)


if __name__ == "__main__":
    build()
