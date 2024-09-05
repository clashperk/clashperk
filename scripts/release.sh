#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Check if a version number is provided
# if [ -z "$1" ]; then
#   echo "Usage: $0 <version-number>"
#   exit 1
# fi

# VERSION=$1
VERSION=$(grep -o '"version": "[^"]*' package.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+')

# Validate the version number format (e.g., x.y.z)
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: Version number must be in the format x.y.z"
  exit 1
fi

# Update the version number in package.json
# sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# Create a new git tag
git tag -a "v$VERSION" -m "Release version $VERSION"

# Push the tag to the remote repository
git push origin "v$VERSION"

echo "Tag 'v$VERSION' created and pushed to remote."