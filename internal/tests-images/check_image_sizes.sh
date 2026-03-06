#!/usr/bin/env bash
#
# Purpose:
#   Pulls the specified Node FDK Build, Runtime, and Code-Only runtime images
#   using Podman, computes their sizes, and verifies they do not exceed the
#   configured expected size thresholds (with a configurable percentage buffer).
#   The script fails the build if any image exceeds its allowed size limit.
#
# Usage:
#   check_image_sizes.sh
#
# Expected environment variables:
#   FDK_VERSION
#   NODE_VERSION
#   OS_VERSION
#   EXPECTED_SIZE_MB_BUILD_IMAGE
#   EXPECTED_SIZE_MB_RUNTIME_IMAGE
#   EXPECTED_SIZE_MB_CODE_ONLY_FN_RUNTIME_IMAGE
#   SIZE_BUFFER_PERCENT (optional, default: 10)
#
set -euo pipefail

: "${IMAGE_BASE:=odo-docker-signed-local.artifactory.oci.oraclecorp.com/fdk-node}"
: "${SIZE_BUFFER_PERCENT:=10}"

echo "FDK_VERSION: $FDK_VERSION"
echo "NODE_VERSION: $NODE_VERSION"
echo "OS_VERSION: $OS_VERSION"
echo "EXPECTED_SIZE_MB_BUILD_IMAGE: $EXPECTED_SIZE_MB_BUILD_IMAGE"
echo "EXPECTED_SIZE_MB_RUNTIME_IMAGE: $EXPECTED_SIZE_MB_RUNTIME_IMAGE"
echo "EXPECTED_SIZE_MB_CODE_ONLY_FN_RUNTIME_IMAGE: $EXPECTED_SIZE_MB_CODE_ONLY_FN_RUNTIME_IMAGE"
echo "BUILD_ARCH: $BUILD_ARCH"

# Required
BUILD_IMAGE_VERSION="$NODE_VERSION-$FDK_VERSION-dev"
RUNTIME_IMAGE_VERSION="$NODE_VERSION-$FDK_VERSION"
CODE_ONLY_FN_RUNTIME_IMAGE_VERSION="$NODE_VERSION-$OS_VERSION-$FDK_VERSION-code-only-fn"

echo "BUILD_IMAGE_VERSION: $BUILD_IMAGE_VERSION"
echo "RUNTIME_IMAGE_VERSION: $RUNTIME_IMAGE_VERSION"
echo "CODE_ONLY_FN_RUNTIME_IMAGE_VERSION: $CODE_ONLY_FN_RUNTIME_IMAGE_VERSION"

command -v podman >/dev/null 2>&1 || { echo "podman not found"; exit 127; }

ceil_mb() { awk '{printf "%d", ($1 + 1024*1024) / (1024*1024)}'; }


pull_if_missing() {
  local img="$1"
  sudo podman image exists "$img" || sudo podman pull "$img" >/dev/null
}

image_size_mb() {
  local img="$1"
  sudo podman image inspect "$img" --format '{{.Size}}' | ceil_mb
}

check_img_size() {
  local label="$1" img="$2" expected="$3" buf="$4"

  echo "== $label =="
  echo "Image: $img"
  pull_if_missing "$img"

  local actual max
  actual="$(image_size_mb "$img")"
  max=$(( expected * (100 + buf) / 100 ))

  echo "Expected: $expected MB"
  echo "Max (+$buf%): $max MB"
  echo "Actual: $actual MB"

  if (( actual > max )); then
    echo "FAIL: $label too large"
    exit 1
  fi

  echo "PASS: $label"
  echo
}

BUILD_IMAGE_REF="${IMAGE_BASE}:${BUILD_IMAGE_VERSION}"
RUNTIME_IMAGE_REF="${IMAGE_BASE}:${RUNTIME_IMAGE_VERSION}"
CODE_ONLY_IMAGE_REF="${IMAGE_BASE}:${CODE_ONLY_FN_RUNTIME_IMAGE_VERSION}"

check_img_size "Build Image" "$BUILD_IMAGE_REF" "$EXPECTED_SIZE_MB_BUILD_IMAGE" "$SIZE_BUFFER_PERCENT"
check_img_size "Runtime Image" "$RUNTIME_IMAGE_REF" "$EXPECTED_SIZE_MB_RUNTIME_IMAGE" "$SIZE_BUFFER_PERCENT"
check_img_size "Code-Only Fn Runtime Image" "$CODE_ONLY_IMAGE_REF" "$EXPECTED_SIZE_MB_CODE_ONLY_FN_RUNTIME_IMAGE" "$SIZE_BUFFER_PERCENT"

echo "All image size checks passed."
