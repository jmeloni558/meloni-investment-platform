"""Match a complete numbered OneDrive photo export to the current Stewart gallery."""
from io import BytesIO
import hashlib
import re
from pathlib import Path
from zipfile import ZipFile

from PIL import Image

IMAGE_TYPES = {'.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'}


def export_names(rows):
    expected = {}
    for row in rows:
        key = row['name']
        if not key or any(char in key for char in ('/', chr(92), ':')):
            raise ValueError('Invalid gallery name')
        original = Path(re.sub(r'^[a-f0-9]{64}--', '', key))
        label = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', row['description']).strip(' .')[:80]
        name = ((label + '-' if label else '') + original.stem[:18] + original.suffix).casefold()
        if name in expected or original.suffix.lower() not in IMAGE_TYPES:
            raise ValueError('Ambiguous photo name')
        expected[name] = row
    return expected


def matched_files(parent, expected):
    matches = []
    for folder in [parent/'PT Photos', *parent.glob('PT Photos - *')]:
        if not folder.is_dir() or folder.resolve().parent != parent:
            continue
        files = sorted(p for p in folder.iterdir() if p.suffix.lower() in IMAGE_TYPES)
        if len(files) != len(expected):
            continue
        found = {}
        for index, path in enumerate(files, 1):
            prefix, sep, tail = path.name.partition('-')
            row = expected.get(tail.casefold())
            if not sep or prefix != str(index).zfill(max(3,len(str(len(files))))) or not row or path.resolve().parent != folder or not path.is_file():
                break
            found[row['name']] = path
        if len(found) == len(expected):
            matches.append(found)
    if len(matches) != 1 or not expected:
        raise ValueError('No unique complete export')
    return matches[0]


def pack_export(parent, rows, output):
    files = matched_files(parent, export_names(rows))
    by_name = {row['name']:row for row in rows}
    with ZipFile(output, 'w') as archive:
        for key, path in files.items():
            data = path.read_bytes()
            with Image.open(BytesIO(data)) as image:
                image.verify()
            digest = re.match(r'^([a-f0-9]{64})--', key)
            original = hashlib.sha256(data).hexdigest() == digest[1] if digest else len(data) == by_name[key].get('size')
            if not original:
                # The OneDrive exporter transposes camera JPEGs and retains their capture tags.
                with Image.open(BytesIO(data)) as image:
                    exif = image.getexif()
                    capture = exif.get_ifd(34665).get(36867) or exif.get(36867)
                    if image.format != 'JPEG' or exif.get(274) != 1 or not capture:
                        raise ValueError('Unrecognized local copy')
                    taken = by_name[key].get('taken')
                    if taken and str(capture)[:10].replace(':','-') != taken:
                        raise ValueError('Capture date differs')
                    image.load()
            archive.writestr(key, data)
