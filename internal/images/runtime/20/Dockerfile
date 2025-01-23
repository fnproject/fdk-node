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

FROM --platform=$TARGETPLATFORM ocr-docker-remote.artifactory.oci.oraclecorp.com/os/oraclelinux:9-slim

RUN microdnf module enable nodejs:20 && \
    microdnf install nodejs npm && \
    microdnf module reset nodejs:20 && \
    microdnf clean all

RUN groupadd --gid 1000 fn && adduser --uid 1000 --gid fn fn

# The NPM version we get from the OS isn't necessarily up to date & may have insecure dependencies. We can use it to install the latest NPM version though. \
# The new npm will be installed in /usr/local/lib and the the original is in /usr/lib and can now be removed
# Finally, we verify the new npm installation

RUN npm --registry=https://artifactory.oci.oraclecorp.com/api/npm/global-release-npm install -g npm@latest && \
    rm -r /usr/lib/node_modules && \
    npm --version

CMD ["node"]

