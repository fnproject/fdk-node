#!/usr/bin/env bash

set -ex

# Login to OCIR
echo ${OCIR_PASSWORD} | docker login --username "${OCIR_USERNAME}" --password-stdin ${OCIR_REGION}

# Build and push the test function images to OCIR for integration test framework.

# Node 14
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node14/hello-world-test 14
  source internal/build-scripts/build_test_image.sh internal/tests-images/node14/timeout-test 14
  source internal/build-scripts/build_test_image.sh internal/tests-images/node14/runtime-version-test 14
  source internal/build-scripts/build_test_image.sh internal/tests-images/node14/oci-sdk-test 14
)

# Node 11
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node11/runtime-version-test 11
)
