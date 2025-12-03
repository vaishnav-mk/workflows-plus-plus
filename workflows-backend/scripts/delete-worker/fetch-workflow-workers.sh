#!/usr/bin/env bash
set -euo pipefail

# Fetch Workers (optionally filtered by prefix) and store them in a JSON file.
#
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   export ACCOUNT_ID=...
#   ./fetch-workflow-workers.sh [output_file] [prefix]
#     output_file: path to write JSON (default: workflow-workers.json)
#     prefix: filter workers whose name starts with this (default: "workflow")
#
# The JSON file will contain an array of:
#   { "serial": 1, "id": "...", "name": "...", "created_on": "..." }

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN and ACCOUNT_ID environment variables must be set."
  exit 1
fi

OUT_FILE="${1:-workflow-workers.json}"
PREFIX="${2:-workflow}"

BASE_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/workers"

tmp_file="${OUT_FILE}.tmp"
rm -f "$tmp_file"

page=1
per_page=100

echo "Fetching Workers (prefix='${PREFIX}') into ${OUT_FILE} ..."

while true; do
  echo "Fetching page ${page}..."

  response=$(curl -sS -X GET "${BASE_URL}?page=${page}&per_page=${per_page}" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json")

  success=$(echo "$response" | jq -r '.success')
  if [[ "$success" != "true" ]]; then
    echo "Error listing workers:"
    echo "$response"
    exit 1
  fi

  # Extract workers (id, name, created_on) whose name starts with PREFIX
  echo "$response" | jq -c --arg p "$PREFIX" \
    '.result[] | select(.name | startswith($p)) | {id, name, created_on}' >> "$tmp_file"

  total=$(echo "$response" | jq -r '.result_info.total_count')
  count=$(echo "$response" | jq -r '.result_info.count')
  per=$(echo "$response" | jq -r '.result_info.per_page')

  # Stop if we've reached the last page
  if (( page * per >= total )) || (( count == 0 )); then
    break
  fi

  page=$((page + 1))
done

if [[ ! -s "$tmp_file" ]]; then
  echo "No workers matched prefix '${PREFIX}'. Writing empty array to ${OUT_FILE}."
  echo "[]" > "$OUT_FILE"
else
  # Convert newline-delimited JSON objects into a JSON array and add a serial number
  jq -s 'to_entries | map(.value + {serial: (.key + 1)})' "$tmp_file" > "$OUT_FILE"
fi

rm -f "$tmp_file"

echo "Done. Wrote workers JSON to ${OUT_FILE}."


