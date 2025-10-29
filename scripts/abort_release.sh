#!/bin/bash

set -euo pipefail

WORKFLOW_NAME="aws-ecr-publish-and-deploy.yml"

echo "Fetching latest workflow run for '$WORKFLOW_NAME'..."

RUN_ID=$(gh run list --workflow "$WORKFLOW_NAME" --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true)

if [[ -z "${RUN_ID}" ]]; then
  echo "❌ No workflow runs found for '$WORKFLOW_NAME'. Nothing to cancel."
  exit 1
fi

echo "Cancelling workflow run ID: $RUN_ID..."
if gh run cancel "$RUN_ID"; then
  echo "✅ Successfully cancelled workflow run: $RUN_ID"
else
  echo "❌ Failed to cancel workflow run: $RUN_ID"
  exit 1
fi