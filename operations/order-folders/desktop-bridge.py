"""Redeem single-use dashboard links and open the matching synced property folder."""
import base64
import json
import os
import re
import subprocess
import shutil
import tempfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
CONFIG = json.loads((HERE / 'settings.json').read_text(encoding='utf-8-sig'))
POWERSHELL = Path(os.environ['SystemRoot']) / 'System32/WindowsPowerShell/v1.0/powershell.exe'
# DPAPI decrypts the sync worker credential only for this Windows user.
KEY = subprocess.check_output([str(POWERSHELL), '-NoProfile', '-NonInteractive', '-Command',
    "$s=Get-Content -Raw -LiteralPath 'worker.key'|ConvertTo-SecureString;[Net.NetworkCredential]::new('', $s).Password"],
    cwd=HERE, creationflags=subprocess.CREATE_NO_WINDOW, timeout=15).decode().strip()


def redeem(ticket, procedure='take_desktop_folder_ticket'):
    body = json.dumps(dict(worker_key=KEY, open_ticket=ticket)).encode()
    request = Request(CONFIG['api']+'/rest/v1/rpc/'+procedure, data=body,
                      headers={'apikey':CONFIG['publishable'],'Content-Type':'application/json'})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


def rrr_sources(folder):
    categories = {
        'subject': r'(?:MLS Broker Synopsis|Subject MLS)(?:[ _-].*)?',
        'imapp': r'iMapp(?:[ _-].*)?',
        'tax': r'(?:Subject Tax|Tax Record)(?:[ _-].*)?',
        'market': r'RPR Neighborhood(?:[ _-].*)?',
        'sold': r'Sold Comp(?:s|arables)?(?:[ _-].*)?',
        'active': r'(?:Active|Pending) Comp(?:s|arables)?(?:[ _-].*)?',
    }
    files = []
    total = 0
    for path in sorted(folder.iterdir()):
        if path.suffix.lower() != '.pdf' or path.is_symlink() or not path.is_file():
            continue
        category = next((k for k, pattern in categories.items()
                         if re.fullmatch(pattern, path.stem, re.I)), None)
        if category is None:
            continue
        size = path.stat().st_size
        total += size
        if size > 15 * 1024**2 or total > 25 * 1024**2 or len(files) >= 12:
            raise ValueError('Source files exceed the BPO upload limits.')
        data = path.read_bytes()
        if b'%PDF-' not in data[:1024]:
            raise ValueError('Unreadable PDF: ' + path.name)
        files.append(dict(category=category, name=path.name,
                          data=base64.b64encode(data).decode('ascii')))
    if not files:
        raise ValueError('No matching BPO source PDFs are in this folder yet.')
    return files


# A top-level local window reads the PDFs on its own origin. Both ends check
# the other window and exact origin before handing over the single-use ticket.
TRANSFER_PAGE = b"""<!doctype html><meta charset="utf-8"><title>PropertyThesis source import</title>
<p>Reading BPO source PDFs for PropertyThesis. This window closes when the files are ready.</p>
<script>
const site='https://propertythesis.com', owner=window.opener;
async function receive(event){
  if(!owner || event.source!==owner || event.origin!==site || event.data?.type!=='rrr-ticket')return;
  removeEventListener('message',receive);
  try{
    const response=await fetch('/rrr-sources',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ticket:event.data.ticket})});
    if(!response.ok)throw Error(response.status===422?(await response.json()).error:'Could not read the order folder.');
    owner.postMessage({type:'rrr-result',files:await response.json()},site);
  }catch(error){owner.postMessage({type:'rrr-result',error:error.message},site);}
}
addEventListener('message',receive);
if(owner)owner.postMessage({type:'rrr-ready'},site);
</script>"""


SETUP_PAGE = b"""<!doctype html><meta charset="utf-8"><title>Setup Folders</title>
<style>body{font:16px system-ui;margin:32px;color:#193c42}button{padding:10px 18px}</style>
<h1>Setup Folders</h1><p id="status">Connecting to PropertyThesis...</p><ul id="issues"></ul>
<button onclick="window.close()">Close</button>
<script>
const site='https://propertythesis.com',owner=window.opener;
async function poll(){
 const response=await fetch('/setup-state');
 const state=await response.json();
 document.getElementById('status').textContent=state.message+' | '+state.completed+' prepared, '+state.skipped+' already set up';
 const list=document.getElementById('issues');list.replaceChildren();
 for(const issue of state.issues){const li=document.createElement('li');li.textContent=issue;list.append(li);}
 if(state.running)setTimeout(poll,2000);
}
async function receive(event){
 if(!owner||event.source!==owner||event.origin!==site||event.data?.type!=='setup-ticket')return;
 removeEventListener('message',receive);
 try{
 const response=await fetch('/setup-folders',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticket:event.data.ticket})});
 if(!response.ok)throw Error('Could not start setup. Return to the dashboard and try again.');
 owner.postMessage({type:'setup-started'},site);poll();
 }catch(e){document.getElementById('status').textContent=e.message;}
}
addEventListener('message',receive);
if(owner)owner.postMessage({type:'setup-ready'},site);
</script>"""

class FolderRequest(BaseHTTPRequestHandler):
    def local_request(self):
        return (self.headers.get('Host') == '127.0.0.1:45273' and
                ((self.headers.get('Origin') == 'https://propertythesis.com' and self.path in ('/stewart-photos', '/rrr-sources', '/setup-folders')) or
                 (self.headers.get('Origin') == 'http://127.0.0.1:45273' and self.path in ('/rrr-sources', '/setup-folders'))))

    def do_OPTIONS(self):
        if not self.local_request():
            return self.send_error(404)
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', 'https://propertythesis.com')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.end_headers()

    def do_POST(self):
        if not self.local_request() or self.headers.get_content_type() != 'application/json':
            return self.send_error(404)
        try:
            from export_photos import property_folder
            from stewart_local import pack_export
            size = int(self.headers['Content-Length'])
            if not 0 < size <= 4 * 1024 * 1024:
                return self.send_error(413)
            payload = json.loads(self.rfile.read(size))
            if self.path == '/setup-folders':
                from setup_folders import start
                orders = redeem(payload['ticket'], 'take_bpo_setup_ticket')
                if orders is None:
                    return self.send_error(410)
                state = start(orders)
                body = json.dumps(state).encode()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            link = redeem(payload['ticket'])
            if not link:
                return self.send_error(410)
            if self.path == '/rrr-sources':
                try:
                    body = json.dumps(rrr_sources(property_folder(link))).encode()
                    code = 200
                except (ValueError, OSError) as exc:
                    body = json.dumps({'error': str(exc)}).encode()
                    code = 422
                self.send_response(code)
                self.send_header('Access-Control-Allow-Origin', 'https://propertythesis.com')
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-store')
                self.end_headers()
                self.wfile.write(body)
                return
            with tempfile.TemporaryFile() as output:
                pack_export(property_folder(link), payload['photos'], output)
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin','https://propertythesis.com')
                self.send_header('Content-Type','application/zip')
                self.send_header('Content-Length',str(output.tell()))
                self.send_header('Cache-Control','no-store')
                self.end_headers()
                output.seek(0)
                shutil.copyfileobj(output,self.wfile)
        except (OSError, ValueError, KeyError, TypeError, ImportError):
            return self.send_error(404, 'Local photo export unavailable')

    def do_GET(self):
        if self.headers.get('Host') == '127.0.0.1:45273' and self.path in ('/setup', '/setup-state'):
            from setup_folders import STATE
            body = SETUP_PAGE if self.path == '/setup' else json.dumps(STATE).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8' if self.path == '/setup' else 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path == '/rrr-import' and self.headers.get('Host') == '127.0.0.1:45273':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Length', str(len(TRANSFER_PAGE)))
            self.end_headers()
            self.wfile.write(TRANSFER_PAGE)
            return
        ticket = re.fullmatch(r'/open/([0-9a-fA-F-]{36})', self.path)
        if self.headers.get('Host') != '127.0.0.1:45273' or not ticket:
            return self.send_error(404)
        try:
            link = redeem(ticket[1])
            if not link:
                return self.send_error(410, 'Link expired. Click the property folder in PropertyThesis again.')
            path = parse_qs(urlsplit(link).query)['id'][0]
            token = base64.urlsafe_b64encode(path.encode()).decode().rstrip('=')
            subprocess.Popen([str(HERE/'PropertyThesis Folder Opener.exe'),'pt-order-folder:'+token])
        except (OSError, ValueError, KeyError):
            return self.send_error(503, 'Unable to open folder. Go back and click the property folder again.')
        self.send_response(204)
        self.send_header('Cache-Control','no-store')
        self.end_headers()

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1',45273),FolderRequest).serve_forever()
