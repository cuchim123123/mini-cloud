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
ADMIN_ROLE_NAME = "admin"
SMOKE_CLIENT_SECRET = "smoke-ci-secret"
REALM_FRONTEND_URL = "http://authentication-identity-server:8080/"
SV01_USERNAME = "sv01"


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
    "secret": SMOKE_CLIENT_SECRET,
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


def request_json_or_none(method, url, data=None, headers=None):
    try:
        return request_json(method, url, data=data, headers=headers)
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return None
        raise


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


def get_single_client(headers, client_id):
    clients = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients?clientId={client_id}",
        headers=headers,
    ) or []
    if not clients:
        return None
    return clients[0]


def ensure_client(headers, desired_client):
    existing = get_single_client(headers, desired_client["clientId"])
    payload = json.dumps(desired_client).encode("utf-8")
    if not existing:
        request(
            "POST",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients",
            data=payload,
            headers={
                "Authorization": headers["Authorization"],
                "Content-Type": "application/json",
            },
        )
        return get_single_client(headers, desired_client["clientId"])

    request(
        "PUT",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{existing['id']}",
        data=payload,
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )
    return get_single_client(headers, desired_client["clientId"])


def ensure_admin_role(headers):
    role = request_json_or_none(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/roles/{ADMIN_ROLE_NAME}",
        headers=headers,
    )
    if role:
        return role

    role_payload = {
        "name": ADMIN_ROLE_NAME,
        "description": "Administrator role",
    }
    request(
        "POST",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/roles",
        data=json.dumps(role_payload).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )
    return request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/roles/{ADMIN_ROLE_NAME}",
        headers=headers,
    )


def ensure_sv01_ready(headers, admin_role):
    users = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users?username={SV01_USERNAME}",
        headers=headers,
    ) or []
    if not users:
        return

    user = users[0]
    user_id = user["id"]
    update_payload = {
        "username": SV01_USERNAME,
        "enabled": True,
        "emailVerified": True,
        "email": "sv01@example.local",
        "firstName": user.get("firstName", "SV"),
        "lastName": user.get("lastName", "01"),
        "requiredActions": [],
    }
    request(
        "PUT",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users/{user_id}",
        data=json.dumps(update_payload).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )

    mapped_roles = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users/{user_id}/role-mappings/realm",
        headers=headers,
    ) or []
    has_admin = any(role.get("name") == ADMIN_ROLE_NAME for role in mapped_roles)
    if has_admin:
        return

    request(
        "POST",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users/{user_id}/role-mappings/realm",
        data=json.dumps([admin_role]).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )


def ensure_audience_mapper(headers, client_id):
    mappers = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
        headers=headers,
    ) or []
    mapper_payload = {
        "name": "aud-myapp",
        "protocol": "openid-connect",
        "protocolMapper": "oidc-audience-mapper",
        "consentRequired": False,
        "config": {
            "included.client.audience": "myapp",
            "access.token.claim": "true",
            "id.token.claim": "false"
        }
    }
    existing = next((mapper for mapper in mappers if mapper.get("name") == "aud-myapp"), None)
    if not existing:
        request(
            "POST",
            f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models",
            data=json.dumps(mapper_payload).encode("utf-8"),
            headers={
                "Authorization": headers["Authorization"],
                "Content-Type": "application/json",
            },
        )
        return

    existing.update({
        "protocol": "openid-connect",
        "protocolMapper": "oidc-audience-mapper",
        "consentRequired": False,
        "config": mapper_payload["config"],
    })
    request(
        "PUT",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{client_id}/protocol-mappers/models/{existing['id']}",
        data=json.dumps(existing).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )


def ensure_smoke_service_account_admin(headers, smoke_client_id, admin_role):
    service_user = request_json_or_none(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/clients/{smoke_client_id}/service-account-user",
        headers=headers,
    )
    if not service_user:
        return

    service_user_id = service_user["id"]
    role_mappings = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users/{service_user_id}/role-mappings/realm",
        headers=headers,
    ) or []
    has_admin = any(role.get("name") == ADMIN_ROLE_NAME for role in role_mappings)
    if has_admin:
        return

    request(
        "POST",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}/users/{service_user_id}/role-mappings/realm",
        data=json.dumps([admin_role]).encode("utf-8"),
        headers={
            "Authorization": headers["Authorization"],
            "Content-Type": "application/json",
        },
    )


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

    realm_response = request_json(
        "GET",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}",
        headers=headers,
    )
    realm_response.setdefault("attributes", {})
    realm_response["attributes"]["frontendUrl"] = REALM_FRONTEND_URL
    request(
        "PUT",
        f"{SERVER_URL}/admin/realms/{REALM_NAME}",
        data=json.dumps(realm_response).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    print("[BOOTSTRAP] Updated realm frontendUrl")

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

    nestjs_client = ensure_client(headers, DESIRED_CLIENT)
    if nestjs_client:
        ensure_audience_mapper(headers, nestjs_client["id"])
        print("[BOOTSTRAP] Ensured nestjs client + audience mapper")

    smoke_client = ensure_client(headers, SMOKE_CLIENT)
    admin_role = ensure_admin_role(headers)
    ensure_sv01_ready(headers, admin_role)
    if smoke_client:
        ensure_smoke_service_account_admin(headers, smoke_client["id"], admin_role)
        print("[BOOTSTRAP] Ensured smoke-ci service-account admin role mapping")


if __name__ == "__main__":
    main()