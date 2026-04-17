#!/bin/sh
set -eu

SERVER_URL="http://authentication-identity-server:8080"
REALM_NAME="realm_sv001"
ADMIN_USER="admin"
ADMIN_PASSWORD="admin"

until /opt/keycloak/bin/kcadm.sh config credentials \
  --server "$SERVER_URL" \
  --realm master \
  --user "$ADMIN_USER" \
  --password "$ADMIN_PASSWORD" >/dev/null 2>&1; do
  sleep 5
done

if /opt/keycloak/bin/kcadm.sh get realms/"$REALM_NAME" >/dev/null 2>&1; then
  exit 0
fi

/opt/keycloak/bin/kcadm.sh create realms -f /opt/keycloak/bootstrap/realm_sv001-realm.json
