#!/usr/bin/env bash
set -ex

CURRENT_PKG_VERSION=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')
export CURRENT_PKG_VERSION

(
  echo "node Version"
  node --version
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
