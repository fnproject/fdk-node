#!/usr/bin/env bash
set -ex

if [ -z "$1" ]; then
  echo "Please supply function directory to build test function image" >>/dev/stderr
  exit 2
fi

if [ -z "$2" ]; then
  echo "Please supply node version as argument to build image." >>/dev/stderr
  exit 2
fi

fn_dir=$1
node_version=$2

(
  # Build test function image for integration test.

  # Copy the npm package built locally from fdk project root dir to function test dir.
  cp -R fnproject-fdk-${BUILD_VERSION}.tgz ${fn_dir}
  pushd ${fn_dir}
  name="$(awk '/^name:/ { print $2 }' func.yaml)"

  version="$(awk '/^runtime:/ { print $2 }' func.yaml)"
  image_identifier="${version}-${BUILD_VERSION}"

  # Push to OCIR
  ocir_image="${OCIR_LOC}/${name}:${image_identifier}"

  docker buildx build --push --platform linux/amd64,linux/arm64 -t "${OCIR_REGION}/${ocir_image}" -f Build_file --build-arg NODE_VERSION=${node_version} --build-arg PKG_VERSION=${BUILD_VERSION} --build-arg OCIR_REGION=${OCIR_REGION} --build-arg OCIR_LOC=${OCIR_LOC} --build-arg BUILD_VERSION=${BUILD_VERSION} .

  # Remove the locally built npm package from the function directory.
  rm -rf fnproject-fdk-${BUILD_VERSION}.tgz
  popd
)
