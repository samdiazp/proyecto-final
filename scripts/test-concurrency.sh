#!/usr/bin/env bash

set -euo pipefail

: "${TRPC_URL:?Set TRPC_URL to the full /api/trpc endpoint}"
: "${ADMIN_TOKEN:?Set ADMIN_TOKEN to a valid user token}"

CAPACITY="${CAPACITY:-2}"
REQUESTS="${REQUESTS:-5}"
PASSWORD="${PASSWORD:-Bookslot123!}"
API_URL="${TRPC_URL%/}"
RUN_ID="$(date +%s)-$RANDOM"
RESERVATION_DATE="${RESERVATION_DATE:-$(date -u -d '+1 hour 5 minutes' '+%Y-%m-%dT%H:%M:%SZ')}"
RESULTS_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$RESULTS_DIR"
}

trap cleanup EXIT

if ! command -v curl >/dev/null || ! command -v jq >/dev/null; then
  echo "curl and jq are required" >&2
  exit 1
fi

if (( REQUESTS <= CAPACITY )); then
  echo "REQUESTS must be greater than CAPACITY" >&2
  exit 1
fi

trpc_request() {
  local procedure="$1"
  local token="$2"
  local payload="$3"
  local args=(
    -sS
    --connect-timeout 10
    --max-time 30
    -X POST "$API_URL/$procedure"
    -H "content-type: application/json"
    -d "$payload"
  )

  if [[ -n "$token" ]]; then
    args+=(-H "authorization: Bearer $token")
  fi

  curl "${args[@]}"
}

resource_payload="$(jq -nc \
  --arg name "Concurrency test $RUN_ID" \
  --arg date "$RESERVATION_DATE" \
  --argjson spots "$CAPACITY" \
  '{name: $name, description: "Automated concurrency test", spots: $spots, reservationDate: $date}')"
echo "Creating resource with $CAPACITY places..."
resource_response="$(trpc_request createResource "$ADMIN_TOKEN" "$resource_payload")"
if ! resource_id="$(jq -er '.result.data.json.resource.resourceId' <<<"$resource_response")"; then
  echo "Unable to create resource: $resource_response" >&2
  exit 1
fi

tokens=()
echo "Creating $REQUESTS test users..."

for ((index = 1; index <= REQUESTS; index++)); do
  email="concurrency-${RUN_ID}-${index}@example.test"
  register_payload="$(jq -nc \
    --arg fullname "Concurrency User $index" \
    --arg email "$email" \
    --arg password "$PASSWORD" \
    '{fullname: $fullname, email: $email, password: $password}')"
  register_response="$(trpc_request register "" "$register_payload")"

  if ! jq -e '.result.data.json.user' >/dev/null <<<"$register_response"; then
    echo "Unable to register user $index: $register_response" >&2
    exit 1
  fi

  login_payload="$(jq -nc \
    --arg email "$email" \
    --arg password "$PASSWORD" \
    '{email: $email, password: $password}')"
  login_response="$(trpc_request login "" "$login_payload")"

  if ! token="$(jq -er '.result.data.json.token' <<<"$login_response")"; then
    echo "Unable to log in user $index: $login_response" >&2
    exit 1
  fi

  tokens+=("$token")
done

pids=()
echo "Sending $REQUESTS concurrent reservation requests..."

for ((index = 1; index <= REQUESTS; index++)); do
  idempotency_key="concurrency-${RUN_ID}-${index}"
  reservation_payload="$(jq -nc \
    --arg resourceId "$resource_id" \
    --arg idempotencyKey "$idempotency_key" \
    '{resourceId: $resourceId, spots: 1, idempotencyKey: $idempotencyKey}')"

  (
    if ! curl -sS --connect-timeout 10 --max-time 30 \
      -o "$RESULTS_DIR/$index.body" -w '%{http_code}' \
      -X POST "$API_URL/createReservation" \
      -H "content-type: application/json" \
      -H "authorization: Bearer ${tokens[$((index - 1))]}" \
      -d "$reservation_payload" >"$RESULTS_DIR/$index.status"; then
      printf '000' >"$RESULTS_DIR/$index.status"
    fi
  ) &
  pids+=("$!")
done

for pid in "${pids[@]}"; do
  wait "$pid"
done

confirmed=0

echo "Resource: $resource_id"
echo "Capacity: $CAPACITY"
echo "Concurrent requests: $REQUESTS"

for ((index = 1; index <= REQUESTS; index++)); do
  status="$(<"$RESULTS_DIR/$index.status")"
  echo "Request $index: HTTP $status"

  if [[ "$status" == "200" ]]; then
    confirmed=$((confirmed + 1))
  fi
done

rejected=$((REQUESTS - confirmed))

echo "Confirmed: $confirmed"
echo "Rejected: $rejected"

if (( confirmed != CAPACITY )); then
  echo "FAIL: expected $CAPACITY confirmed reservations" >&2
  exit 1
fi

echo "PASS: exactly $CAPACITY reservations were confirmed and $rejected were rejected"
