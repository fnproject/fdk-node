#!/usr/bin/env bash

set -eu

REGCTL_BIN=regctl
# Test regctl is on path
$REGCTL_BIN --help

BUILD_TAG=$(git describe --tags)
echo "${BUILD_TAG}"

TEMPDIR=$(mktemp -d)
cd "${TEMPDIR}"

function cleanup {
    rm -rf "${TEMPDIR}"
}
trap cleanup EXIT

{
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22-$BUILD_TAG docker.io/fnproject/node:22-$BUILD_TAG;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22-$BUILD_TAG-dev docker.io/fnproject/node:22-$BUILD_TAG-dev;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22 docker.io/fnproject/node:22;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22-dev docker.io/fnproject/node:22-dev;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:24-$BUILD_TAG docker.io/fnproject/node:24-$BUILD_TAG;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:24-$BUILD_TAG-dev docker.io/fnproject/node:24-$BUILD_TAG-dev;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:24 docker.io/fnproject/node:24;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:24-dev docker.io/fnproject/node:24-dev;
}
