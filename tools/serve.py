#!/usr/bin/env python3
"""
Local/preview server for the Bappa memory journey.

Plain `python3 -m http.server` works, but it answers every request with a full
200 — so the 2024 video cannot be scrubbed. This one adds:

  * HTTP Range requests (video seeking)
  * correct MIME types for .webp / .mp4
  * long cache for immutable assets (img/, Assets/), no-cache for html/json
  * binding to 0.0.0.0 so it works behind a sandbox/preview proxy

Usage:  python3 tools/serve.py [port]     (default 8000)
"""
import os
import re
import sys
import mimetypes
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("application/manifest+json", ".webmanifest")

RANGE = re.compile(r"bytes=(\d*)-(\d*)")


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.startswith(("/img/", "/Assets/", "/css/", "/js/")) or path.endswith(
            (".webp", ".jpg", ".jpeg", ".png", ".mp4", ".woff2")
        ):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def send_head(self):
        """Serve a (possibly partial) file, honouring a single Range header."""
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().send_head()
        if not os.path.exists(path):
            self.send_error(404, "File not found")
            return None

        ctype = self.guess_type(path)
        size = os.path.getsize(path)
        rng = self.headers.get("Range")

        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        if not rng:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            return f

        m = RANGE.match(rng.strip())
        if not m:
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            self.end_headers()
            return f

        start_s, end_s = m.group(1), m.group(2)
        if start_s:
            start = int(start_s)
            end = int(end_s) if end_s else size - 1
        else:                                   # suffix range: last N bytes
            start = max(0, size - int(end_s))
            end = size - 1
        end = min(end, size - 1)

        if start > end or start >= size:
            f.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.end_headers()
            return None

        length = end - start + 1
        f.seek(start)
        self.send_response(206)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        self._send_until = end
        return f

    def copyfile(self, source, outputfile):
        """Range-aware copy: stop at the requested end byte."""
        limit = getattr(self, "_send_until", None)
        if limit is None:
            return super().copyfile(source, outputfile)
        remaining = limit - source.tell() + 1
        while remaining > 0:
            buf = source.read(min(64 * 1024, remaining))
            if not buf:
                break
            outputfile.write(buf)
            remaining -= len(buf)
        self._send_until = None

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = partial(Handler, directory=ROOT)
    with ThreadingHTTPServer(("0.0.0.0", port), handler) as httpd:
        print(f"Serving {ROOT} on http://0.0.0.0:{port}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nशुभ रात्री — server stopped.", flush=True)


if __name__ == "__main__":
    main()
