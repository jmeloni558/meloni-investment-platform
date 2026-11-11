"""Attach a verified order document from the synced property folder to its invoice."""
import json
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from zipfile import ZipFile
from xml.etree import ElementTree

from export_photos import HERE, property_folder

TYPES = {'.pdf':'application/pdf', '.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         '.doc':'application/msword', '.txt':'text/plain', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png'}
LETTER = re.compile(r'\b(?:l\s*o\s*e|(?:letter|notice) of engagement|engagement (?:letter|agreement)|order (?:information|info|details|confirmation|assignment|form)|work order|assignment (?:letter|confirmation|details))\b', re.I)


def words(value):
    return re.sub(r'[^a-z0-9]+', ' ', value.casefold()).strip()


def document_text(path):
    if path.suffix.lower() == '.pdf':
        from pypdf import PdfReader
        reader = PdfReader(path)
        return ' '.join(page.extract_text() or '' for page in reader.pages[:2])
    if path.suffix.lower() == '.docx':
        with ZipFile(path) as archive:
            entry = archive.getinfo('word/document.xml')
            if entry.file_size <= 3_000_000:
                root = ElementTree.fromstring(archive.read(entry))
                return ' '.join(root.itertext())
    if path.suffix.lower() == '.txt':
        return path.read_bytes()[:16000].decode('utf-8', errors='replace')
    return ''


def find_letter(folder, job):
    matches = []
    street = ' '.join(words(job['address']).split()[:3])
    created = datetime.fromisoformat(job['created_at'].replace('Z','+00:00')).timestamp()
    for path in folder.iterdir():
        if path.suffix.lower() not in TYPES or path.name.startswith(('~','.')) or not path.is_file():
            continue
        if path.resolve().parent != folder or path.is_symlink():
            continue
        stat = path.stat()
        if job['reused'] and max(stat.st_ctime,stat.st_mtime) < created:
            continue
        if not 0 < stat.st_size <= 20*1024*1024:
            continue
        if LETTER.search(words(path.stem)):
            matches.append(path)
            continue
        try:
            content = words(document_text(path))
        except (ValueError, OSError, RuntimeError, KeyError, ElementTree.ParseError):
            continue
        order_form = ('property address' in content and 'due date' in content
                      and re.search(r'\border (?:number|id)\b',content))
        if street and street in content and (LETTER.search(content) or order_form):
            matches.append(path)
    return matches


def run():
    cfg = json.loads((HERE/'settings.json').read_text(encoding='utf-8-sig'))
    exe = Path(os.environ['SystemRoot'])/'System32/WindowsPowerShell/v1.0/powershell.exe'
    key = subprocess.check_output([str(exe),'-NoProfile','-NonInteractive','-Command',
        "$ErrorActionPreference='Stop';Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1');"
        "$s=Get-Content -Raw -LiteralPath 'worker.key'|ConvertTo-SecureString;[Net.NetworkCredential]::new('', $s).Password"],
        cwd=HERE,creationflags=subprocess.CREATE_NO_WINDOW,timeout=15).decode().strip()

    def request(action, lease=None, path=None):
        headers = {'Authorization':'Bearer '+key,'apikey':cfg['publishable']}
        data = b''
        if lease:
            headers['X-LOE-Lease'] = lease
        if path:
            headers.update({'X-LOE-Name':quote(path.name,safe=''),'Content-Type':TYPES[path.suffix.lower()]})
            data = path.read_bytes()
        url = cfg['api']+'/functions/v1/qbo?loe='+action
        with urlopen(Request(url, data=data, headers=headers), timeout=90) as response:
            return json.load(response)

    for _ in range(8):
        job = request('claim')
        if not job:
            return
        try:
            matches = find_letter(property_folder(job['folder']),job) if job['folder'] else []
        except FileNotFoundError:
            matches = []
        if len(matches)==1:
            request('upload',job['lease'],matches[0])
        else:
            request('ambiguous' if matches else 'missing',job['lease'])
