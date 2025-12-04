#!/usr/bin/env bash
set -euo pipefail

# Read and display workers from a JSON file produced by fetch-workflow-workers.sh
#
# Usage:
#   ./read-workflow-workers.sh [input_file]
#     input_file: JSON file path (default: workflow-workers.json)
#
# The file is expected to contain an array of:
#   { "id": "...", "name": "...", "created_on": "..." }

FILE="${1:-workflow-workers.json}"

if [[ ! -f "$FILE" ]]; then
  echo "File not found: $FILE"
  exit 1
fi

echo "Reading workers from ${FILE}"
echo

jq -r '
  (["ID", "NAME", "CREATED_ON"] | @tsv),
  (map([.id, .name, .created_on])[] | @tsv)
' "$FILE" | column -t -s $'\t'







