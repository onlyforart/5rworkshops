#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/../website/public/data/event-data.json"
TEMP_FILE="$SCRIPT_DIR/.event-data.tmp"

if node "$SCRIPT_DIR/fetch-events.js" > "$TEMP_FILE"; then
    mv "$TEMP_FILE" "$OUTPUT_FILE"
    echo "Successfully wrote $OUTPUT_FILE" >&2
else
    rm -f "$TEMP_FILE"
    echo "Fetch failed - output file not updated" >&2
    exit 1
fi
