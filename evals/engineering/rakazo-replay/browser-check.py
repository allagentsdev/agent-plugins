"""Exercise the real page-browser helper on a local Chromium checkout."""
import functools
import http.server
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time

HERE = Path(__file__).resolve().parent


def check(repo, chromium, agent_browser):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=HERE)
    with http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler) as server:
        threading.Thread(target=server.serve_forever, daemon=True).start()
        with tempfile.TemporaryDirectory() as profile:
            url = f"http://127.0.0.1:{server.server_port}/checkout.html"
            with subprocess.Popen(
                [chromium, "--headless", "--no-sandbox", "--disable-background-networking",
                 "--remote-debugging-port=0", f"--user-data-dir={profile}",
                 "--window-size=1280,713", url],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            ) as chrome:
                try:
                    port_file = Path(profile) / "DevToolsActivePort"
                    for _ in range(100):
                        if port_file.exists() or chrome.poll() is not None:
                            break
                        time.sleep(0.05)
                    port = port_file.read_text().splitlines()[0]
                    env = {**os.environ, "RAKAZO_CDP_PORT": port, "RAKAZO_AGENT_BROWSER": agent_browser}
                    helper = repo / "infra/sandboxes/computer/rakazo-page-browser"

                    def command(name, args):
                        result = subprocess.run(
                            [sys.executable, str(helper), name, json.dumps(args)], env=env,
                            capture_output=True, text=True, check=True, timeout=30,
                        )
                        return json.loads(result.stdout)

                    for _ in range(40):
                        snapshot = command("snapshot", {})
                        refs = {e.get("name"): e.get("ref") for e in snapshot.get("elements", [])}
                        if refs.get("Add shopper note") and refs.get("Place order"):
                            break
                        time.sleep(0.05)

                    def action(label):
                        return {"actions": [{"kind": "click", "ref": refs[label]}]}

                    note = command("purchase_check", action("Add shopper note"))
                    command("navigate", {"url": url + "?fresh"})
                    snapshot = command("snapshot", {})
                    refs = {e.get("name"): e.get("ref") for e in snapshot["elements"]}
                    note_act = command("act", action("Add shopper note"))
                    note_opened = command("snapshot", {}).get("title") == "Note opened"
                    order = command("purchase_check", action("Place order"))
                    act = command("act", action("Place order"))
                    title = command("snapshot", {}).get("title")
                    return {
                        "note": note, "note_execution": note_act, "note_opened": note_opened, "order": order, "order_execution": act,
                        "note_ok": note.get("ok") is True and "purchase" in note and note["purchase"] is None
                        and note_act.get("ok") is True and note_opened,
                        "order_guarded": isinstance(order.get("purchase"), dict)
                        and act.get("ok") is False and act.get("completed") == 0
                        and title != "Order placed"
                        and act.get("error", "").startswith("This click would complete a purchase"),
                    }
                finally:
                    chrome.terminate()
                    try:
                        chrome.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        chrome.kill()
                        chrome.wait()
                    server.shutdown()


if __name__ == "__main__":
    report = check(Path(sys.argv[1]).resolve(), sys.argv[2], sys.argv[3])
    print(json.dumps(report))
    sys.exit(0 if report["note_ok"] and report["order_guarded"] else 1)
