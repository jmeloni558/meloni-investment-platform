"""Export newly completed, order-linked photo sets into the synced OneDrive tree."""
import base64
import concurrent.futures
import datetime as dt
import filecmp
import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import uuid
import zipfile
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()
HERE = Path(__file__).resolve().parent


def api_request(url, body, apikey):
    headers = {'apikey': apikey, 'Content-Type': 'application/json'}
    with urlopen(Request(url, data=json.dumps(body).encode(), headers=headers), timeout=60) as response:
        data = response.read()
        return json.loads(data) if data else None


def property_folder(link):
    root, prefix = (HERE/'explorer-library.txt').read_text(encoding='utf-8-sig').splitlines()
    root = Path(root).resolve(strict=True)
    path = parse_qs(urlsplit(link).query)['id'][0]
    prefix = prefix.rstrip('/')+'/'
    if not path.casefold().startswith(prefix.casefold()):
        raise ValueError('Folder outside the synced library')
    parts = path[len(prefix):].split('/')
    if any(not part or part in ('.','..') or re.search(r'[<>:"\\|?*]',part) for part in parts):
        raise ValueError('Invalid property folder')
    dest = root.joinpath(*parts).resolve(strict=True)
    if not dest.is_relative_to(root) or not dest.is_dir():
        raise ValueError('Property folder unavailable')
    return dest


def natural(name):
    return [int(x) if i%2 else x.casefold() for i,x in enumerate(re.split(r'(\d+)',name))]


def prepare(item, temp, index, dated, api):
    if urlsplit(item['url']).netloc != urlsplit(api).netloc:
        raise ValueError('Unexpected storage host')
    source = temp / str(index)
    with urlopen(item['url'], timeout=90) as stream, source.open('wb') as output:
        shutil.copyfileobj(stream,output)
    if item['bytes'] and source.stat().st_size != int(item['bytes']):
        raise ValueError('Incomplete photo download')
    name = item['path'].rsplit('/',1)[-1]
    sha, sep, original = name.partition('--')
    if sep and re.fullmatch('[a-f0-9]{64}',sha):
        with source.open('rb') as fp:
            if hashlib.file_digest(fp,'sha256').hexdigest()!=sha:
                raise ValueError('Photo checksum mismatch')
    else:
        original = name
    original = Path(original)
    with Image.open(source) as im:
        exif = im.getexif()
        sub = exif.get_ifd(34665)
        raw = sub.get(36867) or sub.get(36868) or exif.get(36867)
        moment = None
        if raw:
            try:
                moment = dt.datetime.strptime(str(raw)[:19],'%Y:%m:%d %H:%M:%S')
            except ValueError:
                pass
        day = moment.date() if moment else dt.date.fromisoformat(item['taken']) if item.get('taken') else None
        fraction = str(sub.get(37521) or sub.get(37522) or '').strip()
        key = (moment.isoformat()+'.'+fraction.ljust(9,'0') if moment else day.isoformat()+'T99' if day else '~')
        ext = original.suffix
        stamp_suffix = ''
        if dated and not day:
            raise ValueError('Missing capture date for '+original.name+'; enter its Taken date in PT Photos')
        if dated or (ext.lower() in ('.jpg','.jpeg') and exif.get(274,1)!=1):
            upright = ImageOps.exif_transpose(im).convert('RGB')
            tags = upright.getexif()
            tags[274] = 1
            if dated:
                size = max(1,round(min(upright.width/9,min(upright.size)*.038)))
                font = ImageFont.truetype(str(Path(os.environ['WINDIR'])/'Fonts/arialbd.ttf'),size)
                gap = max(1,round(size*.65))
                ImageDraw.Draw(upright).text((upright.width-gap,upright.height-gap),day.strftime('%m/%d/%y'),
                    font=font,anchor='rb',fill='white',stroke_width=max(1,round(size*.09)),stroke_fill='black')
                date = (moment or dt.datetime.combine(day,dt.time())).strftime('%Y:%m:%d %H:%M:%S')
                tags = Image.Exif()
                tags[274],tags[306],tags[34665] = 1,date,{36867:date,36868:date}
                stamp_suffix,ext = '-'+day.isoformat(),'.jpg'
            converted = temp/(str(index)+'.jpg')
            upright.save(converted,'JPEG',quality=95,exif=tags)
            upright.close()
            source = converted
    label = re.sub(r'[<>:"/\\|?*\x00-\x1f]','_',item.get('description') or '').strip(' .')[:80]
    filename = (label+'-' if label else '')+original.stem[:18]+stamp_suffix+ext
    return (key,natural(original.name),name), filename, source


def export(job, parent, api):
    if not job['photos']:
        return
    revision = str(uuid.UUID(job['revision']))
    with tempfile.TemporaryDirectory(prefix='pt-export-') as scratch:
        temp = Path(scratch)
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            images = sorted(pool.map(lambda pair:prepare(pair[1],temp,pair[0],job['dated'],api),enumerate(job['photos'])))
        archive = temp/'photos.zip'
        with zipfile.ZipFile(archive,'w',allowZip64=True) as z:
            width = max(3,len(str(len(images))))
            for index,(_,name,file) in enumerate(images,1):
                z.write(file,f'{index:0{width}}-'+name)
        with tempfile.TemporaryDirectory(prefix='.pt-extract-',dir=parent) as staging:
            ready = Path(staging)/'photos'
            ready.mkdir()
            with zipfile.ZipFile(archive) as z:
                z.extractall(ready)  # CRC checked on read; all member names generated above
            expected = {p.name for p in ready.iterdir()}
            for dest in (parent/'PT Photos', parent/('PT Photos - '+revision)):
                if not dest.exists():
                    ready.rename(dest)
                    break
                if dest.is_dir() and not dest.is_symlink() and {p.name for p in dest.iterdir()}==expected and all(
                        (dest/n).is_file() and filecmp.cmp(ready/n,dest/n,shallow=False) for n in expected):
                    break
            else:
                raise ValueError('An existing export has been modified; destination was preserved')


def run():
    cfg = json.loads((HERE/'settings.json').read_text(encoding='utf-8-sig'))
    exe = Path(os.environ['SystemRoot'])/'System32/WindowsPowerShell/v1.0/powershell.exe'
    key = subprocess.check_output([str(exe),'-NoProfile','-NonInteractive','-Command',
        "$s=Get-Content -Raw -LiteralPath 'worker.key'|ConvertTo-SecureString;[Net.NetworkCredential]::new('', $s).Password"],
        cwd=HERE,creationflags=subprocess.CREATE_NO_WINDOW,timeout=15).decode().strip()
    for _ in range(4):
        job = api_request(cfg['api']+'/functions/v1/completed-photo-export',{'worker_key':key},cfg['publishable'])
        if not job:
            return
        error = None
        try:
            export(job,property_folder(job['folder']),cfg['api'])
        except Exception as exc:
            # Never store a signed download URL in a diagnostic.
            error = str(exc) if isinstance(exc, ValueError) and '://' not in str(exc) else type(exc).__name__
        api_request(cfg['api']+'/rest/v1/rpc/finish_completed_photo_export',
                    dict(worker_key=key,job_lease=job['lease'],failure=error),cfg['publishable'])


if __name__=='__main__':
    run()
