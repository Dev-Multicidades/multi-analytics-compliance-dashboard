import json
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, unquote, urlsplit
from urllib.request import Request, urlopen

from dotenv import load_dotenv


API_ORIGIN = "http://127.0.0.1:8000"
HOST = "127.0.0.1"
PORT = 8080
PROJECT_ROOT = Path(__file__).resolve().parent

CLIENT_SLUGS = {
    "abpf-oncologia",
    "agis",
    "alvarez-marsal",
    "americanas",
    "amino",
    "chep",
    "comexport-trading",
    "de-millus",
    "enforce",
    "flow-invest",
    "grupo-bravante",
    "grupo-libra",
    "hikvision",
    "horizonte-restaurante",
    "imile",
    "inbrands",
}

CLIENT_TOKEN_ENV = {
    slug: f"CLIENT_TOKEN_{slug.replace('-', '_').upper()}"
    for slug in CLIENT_SLUGS
}

CLIENT_ROUTE_PATTERN = re.compile(r"^/compliance/dashboard/([a-z0-9-]+)/?$")
API_PATHS = {
    "/compliance/resumo",
    "/compliance/adesao-produto",
    "/compliance/adesao-cliente",
    "/compliance/adesao-passageiro",
    "/compliance/adesao-autorizador",
    "/compliance/adesao-centro-de-custo",
    "/compliance/rule-reserva",
}

load_dotenv(PROJECT_ROOT / ".env", interpolate=False)


class DashboardHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PROJECT_ROOT), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        path = url.path
        file_name = Path(unquote(path)).name
        if file_name == ".env" or file_name.startswith(".env."):
            self.send_error(404)
            return

        if path.startswith("/compliance/dashboard/"):
            match = CLIENT_ROUTE_PATTERN.fullmatch(path)
            if not match or match.group(1) not in CLIENT_SLUGS:
                self.send_error(404)
                return

            original_path = self.path
            self.path = "/index.html"
            try:
                return super().do_GET()
            finally:
                self.path = original_path

        if path not in API_PATHS:
            return super().do_GET()

        headers = {"Accept": "application/json"}
        route_client = self.headers.get("X-Dashboard-Client")
        if route_client:
            if route_client not in CLIENT_TOKEN_ENV:
                self.send_json_error(403, "Rota de cliente inválida.")
                return
            query_client = parse_qs(url.query).get("cliente_slug", [""])[0]
            if query_client != route_client:
                self.send_json_error(403, "O cliente da rota não corresponde à consulta.")
                return

            access_token = os.environ.get(CLIENT_TOKEN_ENV[route_client], "").strip()
            access_token = re.sub(r"^Bearer\s+", "", access_token, flags=re.IGNORECASE)
            if not access_token:
                self.send_json_error(
                    503,
                    f"Token não configurado para o cliente '{route_client}'.",
                )
                return
            headers["Authorization"] = f"Bearer {access_token}"
        else:
            authorization = self.headers.get("Authorization")
            if authorization:
                headers["Authorization"] = authorization

        request = Request(f"{API_ORIGIN}{self.path}", headers=headers, method="GET")
        try:
            response = urlopen(request, timeout=30)
        except HTTPError as error:
            response = error
        except URLError:
            self.send_error(502, "Não foi possível conectar à API de compliance.")
            return

        with response:
            body = response.read()
            self.send_response(response.status)
            for name in ("Content-Type", "Cache-Control", "WWW-Authenticate"):
                value = response.headers.get(name)
                if value:
                    self.send_header(name, value)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    def send_json_error(self, status, message):
        body = json.dumps({"detail": message}, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        print(f"{self.address_string()} - {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), DashboardHandler)
    print(f"Dashboard disponível em http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor encerrado.")
    finally:
        server.server_close()
