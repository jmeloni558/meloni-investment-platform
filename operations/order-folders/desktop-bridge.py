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


def redeem(ticket):
    body = json.dumps(dict(worker_key=KEY, open_ticket=ticket)).encode()
    request = Request(CONFIG['api']+'/rest/v1/rpc/take_desktop_folder_ticket', data=body,
                      headers={'apikey':CONFIG['publishable'],'Content-Type':'application/json'})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


class FolderRequest(BaseHTTPRequestHandler):
    def local_request(self):
        return (self.headers.get('Host') == '127.0.0.1:45273' and
                self.headers.get('Origin') == 'https://propertythesis.com' and self.path == '/stewart-photos')

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
            link = redeem(payload['ticket'])
            if not link:
                return self.send_error(410)
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
