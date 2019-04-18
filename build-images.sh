#!/usr/bin/env bash
set -ex

nodeversion=${1:-"8"}
pushd images && \
    pushd build-stage && \
        pushd ${nodeversion} && docker build -t fnproject/node:${nodeversion}-dev .; popd && \
    popd && \

    pushd runtime && \
        pushd ${nodeversion} && docker build -t fnproject/node:${nodeversion} .; popd && \
    popd && \
popd
