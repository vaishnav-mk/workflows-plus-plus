#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export CLOUDFLARE_API_TOKEN=... && export ACCOUNT_ID=...
#   ./delete-workflow-workers.sh
#
# The script will:
#   - List all Workers for the account (paginated)
#   - Filter to Workers whose name starts with "workflow"
#   - Delete each matching Worker

if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${ACCOUNT_ID:-}" ]]; then
  echo "CLOUDFLARE_API_TOKEN and ACCOUNT_ID environment variables must be set."
  exit 1
fi

PREFIX="workflow"
BASE_URL="https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/workers/workers"

page=1
per_page=100

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

  # Extract workers whose name starts with the PREFIX
  workers=$(echo "$response" | jq -r --arg p "$PREFIX" '.result[] | select(.name | startswith($p)) | "\(.id) \(.name)"')

  if [[ -z "$workers" ]]; then
    echo "No matching workers on page ${page}."
  else
    echo "$workers" | while read -r id name; do
      echo "Deleting worker: ${name} (${id})"
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
  fi

  total=$(echo "$response" | jq -r '.result_info.total_count')
  count=$(echo "$response" | jq -r '.result_info.count')
  per=$(echo "$response" | jq -r '.result_info.per_page')

  # Stop if we've reached the last page
  if (( page * per >= total )) || (( count == 0 )); then
    echo "Finished processing all pages."
    break
  fi

  page=$((page + 1))
done















