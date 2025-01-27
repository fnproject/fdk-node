#!/usr/bin/env bash

set -eu

REGCTL_BIN=regctl
# Test regctl is on path
$REGCTL_BIN --help

TEMPDIR=$(mktemp -d)
cd "${TEMPDIR}"

function cleanup {
    rm -rf "${TEMPDIR}"
}
trap cleanup EXIT

{
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:20 docker.io/fnproject/node:20;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:20-dev docker.io/fnproject/node:20-dev;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22 docker.io/fnproject/node:22;
$REGCTL_BIN image copy iad.ocir.io/oraclefunctionsdevelopm/fnproject/node:22-dev docker.io/fnproject/node:22-dev;
}
