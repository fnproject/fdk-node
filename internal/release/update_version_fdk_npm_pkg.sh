#!/usr/bin/env bash
set -ex
# Node version is being echoed here as it should be consistent with the latest runtime supported by fncli
echo "node Version"
node --version

# npm -v is being echoed here as it should be consistent with version of the node package manager (npm)
# which comes along with the latest node runtime supported by fncli
echo "npm Version"
npm -v

# Below npm version stmt updates both package.json and package-lock.json
npm version "$1"  --no-git-tag-version
