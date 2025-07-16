#!/bin/bash

set -e

export GIT_REPO_URL="$GIT_REPO_URL"

echo "Cloning repo: $GIT_REPO_URL"

git clone "$GIT_REPO_URL" /app/output

exec node script.js
