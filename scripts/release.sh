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