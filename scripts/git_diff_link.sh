#!/bin/bash

set -e

REMOTE_URL=$(git config --get remote.origin.url)

if [[ ! $REMOTE_URL =~ github.com ]]; then
  echo "Error: This script only supports GitHub repositories."
  exit 1
fi

if [[ $REMOTE_URL =~ ^git@github.com: ]]; then
  REMOTE_URL=$(echo "$REMOTE_URL" | sed -e 's/^git@github.com:/https:\/\/github.com\//')
fi

REMOTE_URL=$(echo "$REMOTE_URL" | sed 's/\.git$//')

LATEST_TAG=$(git describe --tags --abbrev=0)

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

DIFF_URL="$REMOTE_URL/compare/$LATEST_TAG...$CURRENT_BRANCH"

echo "Diff link against the latest tag ($LATEST_TAG):"
echo "$DIFF_URL"