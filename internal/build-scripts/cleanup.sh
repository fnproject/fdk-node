#!/usr/bin/env bash

set -ex

if [ "${LOCAL}" = "true" ] && [ "${RUN_TYPE}" != "release" ]; then
  # Remove locally built package in case of local run
  rm -rf fnproject-fdk-${BUILD_VERSION}.tgz
fi
