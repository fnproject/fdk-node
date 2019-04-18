#!/usr/bin/env bash

set -xe

nodeversion=${1:-"8"}

snyk test --docker fnproject/node:${nodeversion}-dev --file=images/build-stage/${nodeversion}/Dockerfile --json | docker run --rm -i denismakogon/snyk-filter:0.0.6
snyk test --docker fnproject/node:${nodeversion} --file=images/runtime/${nodeversion}/Dockerfile --json | docker run --rm -i denismakogon/snyk-filter:0.0.6
