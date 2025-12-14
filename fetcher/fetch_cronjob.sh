#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

# Execute fetch.js and only proceed if successful
if node fetch-events.js; then
    cd ..
    git add -A
    git commit -m "updated event list"
    git push origin main
fi
