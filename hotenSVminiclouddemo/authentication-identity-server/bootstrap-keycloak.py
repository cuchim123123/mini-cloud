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
SMOKE_CLIENT_ID = "smoke-ci"


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

SMOKE_CLIENT = {
    "clientId": SMOKE_CLIENT_ID,
    "name": SMOKE_CLIENT_ID,
    "enabled": True,
    "publicClient": False,
    "protocol": "openid-connect",
    "standardFlowEnabled": True,
    "directAccessGrantsEnabled": True,
    "serviceAccountsEnabled": True,
    "secret": "smoke-ci-secret",
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

    # Step 1: Update realm attributes (frontendUrl)
    realm_response = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}",
        headers=headers,
    )
    realm_response.setdefault("attributes", {})
    realm_response["attributes"]["frontendUrl"] = "http://authentication-identity-server:8080"
    request(
        "PUT",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}",
        data=json.dumps(realm_response).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    print("[BOOTSTRAP] Updated realm frontendUrl to http://authentication-identity-server:8080")

    # Step 2: Remove old clients
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

    # Step 3: Setup nestjs client
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

    # Step 4: Add audience protocol mapper to nestjs client
    nestjs_clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={NEW_CLIENT_ID}",
        headers=headers,
    ) or []
    if nestjs_clients:
        nestjs_client_id = nestjs_clients[0].get("id")
        # Check if mapper already exists
        mappers = request_json(
            "GET",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{nestjs_client_id}/protocol-mappers/models",
            headers=headers,
        ) or []
        mapper_exists = any(m.get("name") == "aud-myapp" for m in mappers)
        if not mapper_exists:
            mapper_payload = {
                "name": "aud-myapp",
                "protocol": "openid-connect",
                "protocolMapper": "oidc-audience-mapper",
                "consentRequired": False,
                "config": {
                    "included.client.audience": "myapp"
                }
            }
            request(
                "POST",
                f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{nestjs_client_id}/protocol-mappers/models",
                data=json.dumps(mapper_payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            print("[BOOTSTRAP] Added aud-myapp audience mapper to nestjs client")
        else:
            print("[BOOTSTRAP] aud-myapp audience mapper already exists")

    # Step 5: Setup smoke-ci service-account client
    smoke_clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={SMOKE_CLIENT_ID}",
        headers=headers,
    ) or []
    smoke_payload = json.dumps(SMOKE_CLIENT).encode("utf-8")
    if not smoke_clients:
        request(
            "POST",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients",
            data=smoke_payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )
        print("[BOOTSTRAP] Created smoke-ci service-account client")
    else:
        smoke_client_id = smoke_clients[0].get("id")
        if smoke_client_id:
            request(
                "PUT",
                f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{smoke_client_id}",
                data=smoke_payload,
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            print("[BOOTSTRAP] Updated smoke-ci service-account client")

    # Step 6: Map admin role to smoke-ci service-account
    smoke_clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={SMOKE_CLIENT_ID}",
        headers=headers,
    ) or []
    if smoke_clients:
        smoke_client_id = smoke_clients[0].get("id")
        # Get the admin role
        roles = request_json(
            "GET",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/roles",
            headers=headers,
        ) or []
        admin_role = next((r for r in roles if r.get("name") == "admin"), None)
        if admin_role:
            admin_role_id = admin_role.get("id")
            # Check if role is already mapped
            role_mappings = request_json(
                "GET",
                f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{smoke_client_id}/service-account-user/role-mappings/realm",
                headers=headers,
            ) or []
            role_exists = any(r.get("name") == "admin" for r in role_mappings)
            if not role_exists:
                request(
                    "POST",
                    f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{smoke_client_id}/service-account-user/role-mappings/realm",
                    data=json.dumps([admin_role]).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {token}",
                        "Content-Type": "application/json",
                    },
                )
                print("[BOOTSTRAP] Mapped admin role to smoke-ci service-account")
            else:
                print("[BOOTSTRAP] Admin role already mapped to smoke-ci")


if __name__ == "__main__":
    main()