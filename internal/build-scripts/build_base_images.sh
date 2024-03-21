#!/usr/bin/env bash

set -ex

(
  # Build base fdk build and runtime images
  ./internal/build-scripts/build_base_image.sh 20
  ./internal/build-scripts/build_base_image.sh 18
)
