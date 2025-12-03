#!/usr/bin/env bash
set -euo pipefail

# Delete Workers listed in a JSON file produced by fetch-workflow-workers.sh
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   export ACCOUNT_ID=...
#   ./delete-workflow-workers.sh [input_file]
#     input_file: JSON file path (default: workflow-workers.json)
#
# The file is expected to contain an array of:
#   { "serial": 1, "id": "...", "name": "...", "created_on": "..." }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN and ACCOUNT_ID environment variables must be set."
  exit 1
fi

FILE="${1:-workflow-workers.json}"

if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE"
  exit 1
fi

BASE_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/workers"

echo "Deleting workers listed in ${FILE} ..."

count=$(jq 'length' "$FILE")
echo "Total workers to delete: $count"
echo

jq -r '.[] | [.id, .name, .serial] | @tsv' "$FILE" | while IFS=$'\t' read -r id name serial; do
  echo "[$serial/$count] Deleting worker: ${name} (${id})"

  del_resp=$(curl -sS -X DELETE "${BASE_URL}/${id}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json")

  del_success=$(echo "$del_resp" | jq -r '.success')
  if [[ "$del_success" != "true" ]]; then
    echo "  Failed to delete ${name}:"
    echo "  $del_resp"
  else
    echo "  Deleted."
  fi
done

echo
echo "Finished deleting workers from ${FILE}."





