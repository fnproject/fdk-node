#!/usr/bin/env bash

set -ex

# Login to OCIR
set +x
echo ${OCIR_PASSWORD} | docker login --username "${OCIR_USERNAME}" --password-stdin ${OCIR_REGION}
set -x

# Build and push the test function images to OCIR for integration test framework.

#Node 20
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node20/hello-world-test 20
  source internal/build-scripts/build_test_image.sh internal/tests-images/node20/timeout-test 20
  source internal/build-scripts/build_test_image.sh internal/tests-images/node20/runtime-version-test 20
  source internal/build-scripts/build_test_image.sh internal/tests-images/node20/oci-sdk-test 20
)

# Node 18
(
  source internal/build-scripts/build_test_image.sh internal/tests-images/node18/runtime-version-test 18
)
