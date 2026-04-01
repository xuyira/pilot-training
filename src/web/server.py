from __future__ import annotations

import json
import mimetypes
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from src.core.config_loader import ConfigLoader
from src.web.session_manager import SessionManager


ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"


class AppServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], handler_class: type[SimpleHTTPRequestHandler]) -> None:
        super().__init__(server_address, handler_class)
        config_bundle = ConfigLoader(ROOT_DIR).load_all()
        self.session_manager = SessionManager(ROOT_DIR, config_bundle)


class RequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND_DIR), **kwargs)

    @property
    def app_server(self) -> AppServer:
        return self.server  # type: ignore[return-value]

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/bootstrap":
            self._send_json(HTTPStatus.OK, self.app_server.session_manager.bootstrap_payload())
            return
        if parsed.path == "/" or parsed.path == "/index.html":
            self.path = "/index.html"
            return super().do_GET()
        if parsed.path.startswith("/assets/") or parsed.path in {"/app.js", "/styles.css"}:
            self.path = parsed.path
            return super().do_GET()
        self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        payload = self._read_json_body()
        try:
            if parsed.path == "/api/session/start":
                response = self.app_server.session_manager.create_session(payload)
                self._send_json(HTTPStatus.CREATED, response)
                return
            if parsed.path.startswith("/api/session/") and parsed.path.endswith("/block/start"):
                token = parsed.path.split("/")[3]
                response = self.app_server.session_manager.start_block(token)
                self._send_json(HTTPStatus.OK, response)
                return
            if parsed.path.startswith("/api/session/") and parsed.path.endswith("/event"):
                token = parsed.path.split("/")[3]
                response = self.app_server.session_manager.log_event(token, payload)
                self._send_json(HTTPStatus.OK, response)
                return
            if parsed.path.startswith("/api/session/") and parsed.path.endswith("/block/complete"):
                token = parsed.path.split("/")[3]
                response = self.app_server.session_manager.complete_block(token)
                self._send_json(HTTPStatus.OK, response)
                return
            self._send_json(HTTPStatus.NOT_FOUND, {"error": "Not found"})
        except KeyError as exc:
            self._send_json(HTTPStatus.NOT_FOUND, {"error": str(exc)})
        except ValueError as exc:
            self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(exc)})

    def log_message(self, format: str, *args) -> None:
        return

    def guess_type(self, path: str) -> str:
        if path.endswith(".js"):
            return "application/javascript; charset=utf-8"
        if path.endswith(".css"):
            return "text/css; charset=utf-8"
        return mimetypes.guess_type(path)[0] or "application/octet-stream"

    def _read_json_body(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _send_json(self, status: HTTPStatus, payload: dict) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)


def main(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = AppServer((host, port), RequestHandler)
    print(f"Serving Flight Cognitive Training on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
