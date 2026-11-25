#!/bin/bash
# Daily start-up for the BTP trial environment (HANA + 2 apps).
# Usage:  bash start-all.sh
# Order matters: HANA first, then the existing API, then the new app.

echo "1/5 Checking Cloud Foundry login..."
if ! cf apps > /dev/null 2>&1; then
  echo "Not logged in (or the token expired). Run: cf login"
  echo "Then run this script again."
  exit 1
fi
echo "    login OK"

echo "2/5 Starting HANA (can take a few minutes)..."
if ! cf update-service invoice-hana-db -c '{"data":{"serviceStopped":false}}'; then
  echo "    (update command returned an error. Continuing: HANA may already be running.)"
fi
sleep 10   # let the broker register the operation

while true; do
  S=$(cf service invoice-hana-db | grep -E "^ +status:" | head -n1)
  echo "    $S"
  case "$S" in
    *succeeded*) break ;;
    *failed*)
      echo "HANA operation failed. Run: cf service invoice-hana-db   and send me the output."
      exit 1
      ;;
  esac
  sleep 30
done

# On the first deploy, HANA said 'succeeded' but refused connections for a short while.
echo "3/5 HANA reports ready. Waiting 60s for it to accept connections..."
sleep 60

echo "4/5 Starting translation-service-srv (the existing API)..."
cf start translation-service-srv

echo "5/5 Restarting invoice-translation-app-srv (fresh HANA connection)..."
cf restart invoice-translation-app-srv

echo
echo "---- Status ----"
cf apps

# The key itself is never printed, only whether it is still set (expected: 1).
KEYSET=$(cf env invoice-translation-app-srv | grep -c '^TRANSLATION_API_KEY:')
echo "TRANSLATION_API_KEY set on invoice-translation-app-srv: $KEYSET (expected 1)"

echo
echo "Done. Now test in Postman: request 0 (Metadata), 2 (Dictionary list), 5 (Hub)."