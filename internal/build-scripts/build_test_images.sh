#!/usr/bin/env bash

set -ex

# Login to OCIR
set +x
echo ${OCIR_PASSWORD} | docker login --username "${OCIR_USERNAME}" --password-stdin ${OCIR_REGION}
set -x

# Build and push the test function images to OCIR for integration test framework.

# Node 18
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node18/hello-world-test 18
  source internal/build-scripts/build_test_image.sh internal/tests-images/node18/timeout-test 18
  source internal/build-scripts/build_test_image.sh internal/tests-images/node18/runtime-version-test 18
  source internal/build-scripts/build_test_image.sh internal/tests-images/node18/oci-sdk-test 18
)

# Node 16
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node16/runtime-version-test 16
)

# Node 14
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node14/runtime-version-test 14
)
