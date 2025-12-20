#!/bin/bash

# Source user profile to get PATH and environment variables
source ~/.bash_profile 2>/dev/null || source ~/.zprofile 2>/dev/null

# Change to the script's directory
cd "$(dirname "$0")"

NEWDATE=$( date )

# Execute fetch.js and only proceed if successful
if "./fetch.sh"; then
    cd ..
    git add -A
    git commit -m "updated event list ($NEWDATE)"
    git push origin main
fi
