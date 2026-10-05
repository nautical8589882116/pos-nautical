"""Static file server for blog.nautical.co.in on the `nautical-website` App Service.

Runs as the app's startup command (`python server.py`). Serves the files next to it,
maps /slug/ -> /slug/index.html, applies redirects.json (old URLs -> new) and
returns 404.html for anything missing. Standard library only.
"""
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.abspath(__file__))

try:
    with open(os.path.join(ROOT, "redirects.json"), encoding="utf-8") as fh:
        REDIRECTS = json.load(fh)
except (OSError, ValueError):
    REDIRECTS = {}


class BlogHandler(SimpleHTTPRequestHandler):
    server_version = "NauticalBlog"
    sys_version = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _redirect(self, location, status=HTTPStatus.MOVED_PERMANENTLY):
        self.send_response(status)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _route(self):
        parts = urlsplit(self.path)
        path = parts.path
        target = REDIRECTS.get(path)
        if target:
            self._redirect(target + (f"?{parts.query}" if parts.query else ""))
            return False
        # never expose the server itself or the redirect map
        if path in ("/server.py", "/redirects.json") or "/." in path:
            self.send_error(HTTPStatus.NOT_FOUND)
            return False
        return True

    def do_GET(self):
        if self._route():
            super().do_GET()

    def do_HEAD(self):
        if self._route():
            super().do_HEAD()

    def list_directory(self, path):  # no directory listings
        self.send_error(HTTPStatus.NOT_FOUND)
        return None

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, "404.html")
        if code == HTTPStatus.NOT_FOUND and os.path.exists(page):
            with open(page, "rb") as fh:
                body = fh.read()
            self.send_response(code)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def end_headers(self):
        path = urlsplit(self.path).path
        if path.endswith((".css", ".js", ".png", ".jpg", ".jpeg", ".webp", ".svg", ".woff2")):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "public, max-age=300")
        self.send_header("X-Content-Type-Options", "nosniff")
        super().end_headers()

    def guess_type(self, path):
        ctype = super().guess_type(path)
        if ctype in ("text/html", "text/plain", "application/xml", "text/xml"):
            return f"{ctype}; charset=utf-8"
        return ctype

    def log_message(self, fmt, *args):  # one line per request into App Service logs
        print("%s %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT") or os.environ.get("WEBSITES_PORT") or 8000)
    ThreadingHTTPServer.daemon_threads = True
    print(f"blog server on 0.0.0.0:{port} serving {ROOT}", flush=True)
    ThreadingHTTPServer(("0.0.0.0", port), BlogHandler).serve_forever()
