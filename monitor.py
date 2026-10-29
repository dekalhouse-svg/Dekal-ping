#!/usr/bin/env python3
"""Check configured URLs and update results.json. Uses only the Python standard library."""
import json
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SERVERS_FILE = ROOT / "servers.json"
RESULTS_FILE = ROOT / "results.json"
TIMEOUT_SECONDS = 60
MAX_RESPONSE_BYTES = 2048

def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

def check_server(server):
    url = str(server.get("url", "")).strip()
    item = {
        "id": server.get("id") or url,
        "name": str(server.get("name") or url),
        "url": url,
        "checked_at": utc_now(),
        "status": "down",
        "http_status": None,
        "response_ms": None,
        "error": None,
    }
    if not url.startswith(("https://", "http://")):
        item["error"] = "URL invalide : utilisez http:// ou https://"
        return item
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "DEKAL-PING-Monitor/1.0", "Accept": "*/*"},
        method="GET",
    )
    started = time.monotonic()
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as response:
            response.read(MAX_RESPONSE_BYTES)
            item["http_status"] = response.status
            item["status"] = "up" if 200 <= response.status < 400 else "down"
    except urllib.error.HTTPError as error:
        item["http_status"] = error.code
        item["status"] = "up" if 200 <= error.code < 400 else "down"
        item["error"] = f"Réponse HTTP {error.code}" if error.code >= 400 else None
    except Exception as error:
        item["error"] = f"{type(error).__name__}: {str(error)[:180]}"
    finally:
        item["response_ms"] = round((time.monotonic() - started) * 1000, 1)
    return item

def main():
    config = json.loads(SERVERS_FILE.read_text(encoding="utf-8"))
    servers = config.get("servers", [])
    results = [check_server(server) for server in servers if server.get("enabled", True)]
    payload = {"checked_at": utc_now(), "results": results}
    RESULTS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Vérification terminée : {len(results)} site(s), à {payload['checked_at']}")
    for item in results:
        print(f"- {item['name']}: {item['status']} HTTP={item['http_status']} {item['response_ms']} ms")

if __name__ == "__main__":
    main()
