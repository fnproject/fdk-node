#!/usr/bin/env bash
set -ex

CURRENT_PKG_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')
export CURRENT_PKG_VERSION

(
  # Node version is being echoed here as it should be consistent with the latest runtime supported by fncli
  echo "node Version"
  node --version

  # npm -v is being echoed here as it should be consistent with version of the node package manager (npm)
  # which comes along with the latest node runtime supported by fncli
  echo "npm Version"
  npm -v

  echo "Perform npm install to ensure package is not broken"
  npm install

  echo "Create fdk node npm package"
  if [ ! "${CURRENT_PKG_VERSION}" = "${BUILD_VERSION}" ] ; then
    npm version "$BUILD_VERSION"  --no-git-tag-version
  fi

  npm pack

  if [ ! "${CURRENT_PKG_VERSION}" = "${BUILD_VERSION}" ] ; then
    npm version "$CURRENT_PKG_VERSION"  --no-git-tag-version
  fi
)
