"""Local desktop bridge for the signed-in PropertyThesis dashboard."""
import base64
import json
import subprocess
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ORIGIN = 'https://propertythesis.com'
OPENER = Path(__file__).with_name('PropertyThesis Folder Opener.exe')


class FolderRequest(BaseHTTPRequestHandler):
    def permitted(self):
        return (self.path == '/property-folder' and self.headers.get('Host') == '127.0.0.1:45273'
                and self.headers.get('Origin') == ORIGIN)

    def reply(self, code):
        self.send_response(code)
        self.send_header('Access-Control-Allow-Origin', ORIGIN)
        self.send_header('Access-Control-Allow-Private-Network', 'true')
        self.send_header('Access-Control-Allow-Methods', 'POST')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def do_OPTIONS(self):
        self.reply(204 if self.permitted() else 403)

    def do_POST(self):
        if not self.permitted() or self.headers.get_content_type() != 'application/json':
            return self.reply(403)
        try:
            length = int(self.headers.get('Content-Length', 0))
            if not 0 < length <= 12000:
                return self.reply(400)
            path = json.loads(self.rfile.read(length))['path']
            if not isinstance(path, str) or not path:
                return self.reply(400)
            token = base64.urlsafe_b64encode(path.encode()).decode().rstrip('=')
            subprocess.Popen([str(OPENER), 'pt-order-folder:' + token])
        except (ValueError, KeyError, TypeError, OSError):
            return self.reply(400)
        self.reply(204)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    HTTPServer(('127.0.0.1', 45273), FolderRequest).serve_forever()
