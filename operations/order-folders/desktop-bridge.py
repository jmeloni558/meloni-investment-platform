"""Redeem single-use dashboard links and open the matching synced property folder."""
import base64
import json
import os
import re
import subprocess
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


class FolderRequest(BaseHTTPRequestHandler):
    def do_GET(self):
        ticket = re.fullmatch(r'/open/([0-9a-fA-F-]{36})', self.path)
        if self.headers.get('Host') != '127.0.0.1:45273' or not ticket:
            return self.send_error(404)
        try:
            body = json.dumps(dict(worker_key=KEY, open_ticket=ticket[1])).encode()
            request = Request(CONFIG['api']+'/rest/v1/rpc/take_desktop_folder_ticket', data=body,
                              headers={'apikey':CONFIG['publishable'],'Content-Type':'application/json'})
            with urlopen(request, timeout=10) as response:
                link = json.load(response)
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
