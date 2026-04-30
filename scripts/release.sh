#!/bin/bash

set -e

VERSION=$(grep -o '"version": "[^"]*' package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version number must be in the format x.y.z"
  exit 1
fi

git tag -a "v$VERSION" -m "Release version $VERSION"

git push origin "v$VERSION"

echo "Tag 'v$VERSION' created and pushed to remote."

REMOTE_URL=$(git config --get remote.origin.url)

if [[ $REMOTE_URL =~ ^git@github.com: ]]; then
  REMOTE_URL=$(echo "$REMOTE_URL" | sed -e 's/^git@github.com:/https:\/\/github.com\//')
fi

REMOTE_URL=$(echo "$REMOTE_URL" | sed 's/\.git$//')

PREV_TAG=$(git describe --tags --abbrev=0 "v$VERSION^")

echo ""
echo "Diff link against the previous tag ($PREV_TAG):"
echo "$REMOTE_URL/compare/$PREV_TAG...v$VERSION"