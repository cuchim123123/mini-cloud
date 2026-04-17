import base64
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request


SERVER_URL = os.environ.get("KEYCLOAK_URL", "http://authentication-identity-server:8080")
ADMIN_USER = os.environ.get("KEYCLOAK_ADMIN", "admin")
ADMIN_PASSWORD = os.environ.get("KEYCLOAK_ADMIN_PASSWORD", "admin")
REALM_PATH = "/opt/keycloak/bootstrap/realm_sv001-realm.json"
REALM_NAME = "realm_sv001"
OLD_CLIENT_ID = "flask-app"
NEW_CLIENT_ID = "nestjs"


DESIRED_CLIENT = {
    "clientId": NEW_CLIENT_ID,
    "name": NEW_CLIENT_ID,
    "enabled": True,
    "publicClient": True,
    "protocol": "openid-connect",
    "standardFlowEnabled": True,
    "directAccessGrantsEnabled": True,
    "serviceAccountsEnabled": False,
    "rootUrl": "http://localhost:8085",
    "baseUrl": "http://localhost:8085",
    "redirectUris": ["*"],
    "webOrigins": ["*"],
}


def request(method, url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method)
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.read().decode("utf-8")


def request_json(method, url, data=None, headers=None):
    body = request(method, url, data=data, headers=headers)
    if not body:
        return None
    return json.loads(body)


def get_admin_token():
    payload = urllib.parse.urlencode({
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": ADMIN_USER,
        "password": ADMIN_PASSWORD,
    }).encode("utf-8")
    response = request(
        "POST",
        f"{SERVER_URL}/realms/master/protocol/openid-connect/token",
        data=payload,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return json.loads(response)["access_token"]


def main():
    for _ in range(60):
        try:
            token = get_admin_token()
            break
        except Exception:
            time.sleep(2)
    else:
        raise SystemExit("Keycloak never became ready")

    headers = {"Authorization": f"Bearer {token}"}
    realm_exists = True
    try:
        request("GET", f"{SERVER_URL}/admin/realms/{REALM_NAME}", headers=headers)
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise
        realm_exists = False

    if not realm_exists:
        with open(REALM_PATH, "rb") as handle:
            payload = handle.read()

        request(
            "POST",
            f"{SERVER_URL}/admin/realms",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

    old_clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={OLD_CLIENT_ID}",
        headers=headers,
    ) or []
    for old_client in old_clients:
        old_id = old_client.get("id")
        if old_id:
            request(
                "DELETE",
                f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{old_id}",
                headers=headers,
            )

    new_clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={NEW_CLIENT_ID}",
        headers=headers,
    ) or []

    payload = json.dumps(DESIRED_CLIENT).encode("utf-8")
    if not new_clients:
        request(
            "POST",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
    else:
        client_id = new_clients[0].get("id")
        if client_id:
            request(
                "PUT",
                f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{client_id}",
                data=payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )


if __name__ == "__main__":
    main()