"""Add Meloni Realty artwork without moving any v14 form field.

Run after prepare-v14.py, with the approved two-page template already installed.
Preserves the AcroForm, document JavaScript, field geometry and page sizes.
"""
from io import BytesIO
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import pymupdf as fitz

root = Path(__file__).resolve().parents[2]
assets = root / 'assets/bpo'
reader = PdfReader(assets / 'template.pdf')
assert len(reader.pages) == 2
before = reader.get_fields()
logo = Image.open(assets / 'meloni-realty-horizontal.png').convert('RGBA')
logo = logo.crop(logo.getchannel('A').point(lambda a: 255 if a > 10 else 0).getbbox())
overlay = BytesIO()
c = canvas.Canvas(overlay, pagesize=(612, 1008))
for i, page in enumerate(reader.pages):
    width, height = float(page.mediabox.width), float(page.mediabox.height)
    c.setPageSize((width, height))
    if i == 0:
        # Replace only the static title band, above the first row of widgets.
        c.setFillColorRGB(1, 1, 1)
        c.rect(24, height - 43, width - 48, 35, fill=1, stroke=0)
        c.drawImage(ImageReader(logo), 29, height - 36, width=111,
                    height=111 * logo.height / logo.width, mask='auto')
        c.setFillColorRGB(0.02, 0.18, 0.29)
        c.setFont('Helvetica-Bold', 13)
        c.drawRightString(width - 29, height - 30, 'RESIDENTIAL BROKER PRICE OPINION')
    else:
        # Empty space beside the marketing heading; no body content is shifted.
        c.drawImage(ImageReader(logo), width - 130, height - 36, width=101,
                    height=101 * logo.height / logo.width, mask='auto')
    c.showPage()
c.save()
art = PdfReader(overlay)
writer = PdfWriter()
writer.clone_document_from_reader(reader)
for i, page in enumerate(writer.pages):
    page.merge_page(art.pages[i])
writer.add_metadata({'/Title': 'Meloni Realty - Residential Broker Price Opinion'})
out = BytesIO()
writer.write(out)
result = out.getvalue()
check = PdfReader(BytesIO(result))
assert len(check.pages) == 2
assert set(check.get_fields()) == set(before)
for i, page in enumerate(check.pages):
    assert page.mediabox == reader.pages[i].mediabox
    assert [a.get_object().get('/Rect') for a in page['/Annots']] == [
        a.get_object().get('/Rect') for a in reader.pages[i]['/Annots']]
assert check.trailer['/Root'].get('/Names') is not None
(assets / 'template.pdf').write_bytes(result)
background = PdfWriter()
background.clone_document_from_reader(check)
for page in background.pages:
    page.pop(NameObject('/Annots'), None)
background.root_object.pop(NameObject('/AcroForm'), None)
background.root_object.pop(NameObject('/Names'), None)
with (assets / 'background.pdf').open('wb') as f:
    background.write(f)
with fitz.open(assets / 'background.pdf') as doc:
    for i, page in enumerate(doc):
        page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(assets / f'page-{i+1}.png')
output = root / 'output/pdf'
output.mkdir(parents=True, exist_ok=True)
(output / 'Meloni-Realty-General-BPO.pdf').write_bytes(result)
print(f'Branded two pages; preserved {len(before)} fields and all widget positions.')
