#!/usr/bin/env bash
#
# Copyright (c) 2019, 2020 Oracle and/or its affiliates. All rights reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#


set -xe

user="fnproject"
image="node"
node_version="11"
printenv DOCKER_PASS | docker login -u ${DOCKER_USER} --password-stdin

pushd images/build-stage/${node_version} && docker build -t ${user}/${image}:${node_version}-dev . && popd
pushd images/runtime/${node_version} && docker build -t ${user}/${image}:${node_version} . && popd

docker image ls

docker push ${user}/${image}:${node_version}-dev
docker push ${user}/${image}:${node_version}