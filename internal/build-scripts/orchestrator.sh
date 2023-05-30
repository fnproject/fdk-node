#!/usr/bin/env bash

set -ex

BUILD_VERSION=${BUILD_VERSION:-1.0.0-SNAPSHOT}
LOCAL=${LOCAL:-true}

export BUILD_VERSION
export LOCAL

# Update buildx and prepare builderInstance
./internal/build-scripts/init-buildx.sh


(
  # Unit test run section
  docker build -t fdk_node_env_image -f ./internal/docker-files/Dockerfile_unit_test_run .
  docker run --rm fdk_node_env_image ./internal/build-scripts/execute_unit_tests.sh
)

(
  # build npm package
  docker build -t fdk_npm_pkg_build_image -f ./internal/docker-files/Dockerfile_fdk_node_npm_pkg_build .
  docker run --rm -v $PWD:/build -w /build --env BUILD_VERSION=${BUILD_VERSION} fdk_npm_pkg_build_image ./internal/build-scripts/build_fdk_npm_pkg.sh
)

(
  # Build base fdk build and runtime
  source internal/build-scripts/build_base_images.sh
)

(
  # Build the test integration images
  source internal/build-scripts/build_test_images.sh
)

(
  # Perform cleanup as necessary
  source internal/build-scripts/cleanup.sh
)
