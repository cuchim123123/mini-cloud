import base64
import json
import os
import time
import urllib.error
import urllib.request


GRAFANA_URL = os.environ.get("GRAFANA_URL", "http://monitoring-grafana-dashboard-server:3000")
AUTH = base64.b64encode(b"admin:admin").decode("ascii")
DASHBOARD_PATH = "/opt/grafana/bootstrap/system-health.json"


def request(method, url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Basic {AUTH}")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read().decode("utf-8")


def main():
    for _ in range(60):
        try:
            request("GET", f"{GRAFANA_URL}/api/health")
            break
        except Exception:
            time.sleep(2)
    else:
        raise SystemExit("Grafana never became ready")

    dashboards = json.loads(request("GET", f"{GRAFANA_URL}/api/search?type=dash-db"))
    if any(item.get("uid") == "system-health" for item in dashboards):
        return

    with open(DASHBOARD_PATH, "r", encoding="utf-8") as handle:
        dashboard = json.load(handle)

    payload = json.dumps({
        "dashboard": dashboard,
        "folderId": 0,
        "overwrite": True,
    }).encode("utf-8")

    request(
        "POST",
        f"{GRAFANA_URL}/api/dashboards/db",
        data=payload,
        headers={"Content-Type": "application/json"},
    )


if __name__ == "__main__":
    main()