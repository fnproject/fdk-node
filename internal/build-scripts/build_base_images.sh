#!/usr/bin/env bash

set -ex

(
  #Create the builder instance
  docker buildx rm builderInstance || true
  docker buildx create --name builderInstance --driver-opt=image=docker-remote.artifactory.oci.oraclecorp.com/moby/buildkit:buildx-stable-1 --platform linux/amd64,linux/arm64
  docker buildx use builderInstance

  # Build base fdk build and runtime images
  ./internal/build-scripts/build_base_image.sh 14
  ./internal/build-scripts/build_base_image.sh 11
)
