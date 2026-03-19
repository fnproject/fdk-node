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

RUN microdnf module enable nodejs:24 && \
    microdnf install nodejs npm gzip && \
    microdnf module reset nodejs:24 && \
    microdnf update -y && \
    microdnf clean all

# The NPM version we get from the OS isn't necessarily up to date & may have insecure dependencies. We can use it to install the latest NPM version though. \
# The new npm will be installed in /usr/local/lib and the the original is in /usr/lib and can now be removed
# Finally, we verify the new npm installation

RUN npm --registry=https://artifactory.oci.oraclecorp.com/api/npm/global-release-npm install -g npm@11.9.0 && \
    mkdir -p /tmp/npm-patch /tmp/pkg-tar /tmp/pkg-minimatch-modern /tmp/pkg-minimatch-legacy /tmp/pkg-brace-expansion /tmp/pkg-balanced-match && \
    cd /tmp/npm-patch && \
    npm --registry=https://artifactory.oci.oraclecorp.com/api/npm/global-release-npm pack tar@7.5.10 minimatch@10.2.3 minimatch@9.0.7 brace-expansion@2.0.2 balanced-match@1.0.2 && \
    tar -xzf /tmp/npm-patch/tar-7.5.10.tgz -C /tmp/pkg-tar && \
    tar -xzf /tmp/npm-patch/minimatch-10.2.3.tgz -C /tmp/pkg-minimatch-modern && \
    tar -xzf /tmp/npm-patch/minimatch-9.0.7.tgz -C /tmp/pkg-minimatch-legacy && \
    tar -xzf /tmp/npm-patch/brace-expansion-2.0.2.tgz -C /tmp/pkg-brace-expansion && \
    tar -xzf /tmp/npm-patch/balanced-match-1.0.2.tgz -C /tmp/pkg-balanced-match && \
    rm -rf /usr/local/lib/node_modules/npm/node_modules/tar /usr/local/lib/node_modules/npm/node_modules/minimatch /usr/local/lib/node_modules/npm/node_modules/brace-expansion /usr/local/lib/node_modules/npm/node_modules/balanced-match && \
    cp -R /tmp/pkg-tar/package /usr/local/lib/node_modules/npm/node_modules/tar && \
    cp -R /tmp/pkg-minimatch-modern/package /usr/local/lib/node_modules/npm/node_modules/minimatch && \
    cp -R /tmp/pkg-brace-expansion/package /usr/local/lib/node_modules/npm/node_modules/brace-expansion && \
    cp -R /tmp/pkg-balanced-match/package /usr/local/lib/node_modules/npm/node_modules/balanced-match && \
    if [ -d /usr/local/lib/node_modules/npm/node_modules/@tufjs/models/node_modules ]; then \
      rm -rf /usr/local/lib/node_modules/npm/node_modules/@tufjs/models/node_modules/minimatch && \
      cp -R /tmp/pkg-minimatch-legacy/package /usr/local/lib/node_modules/npm/node_modules/@tufjs/models/node_modules/minimatch; \
    fi && \
    rm -rf /tmp/npm-patch /tmp/pkg-tar /tmp/pkg-minimatch-modern /tmp/pkg-minimatch-legacy /tmp/pkg-brace-expansion /tmp/pkg-balanced-match && \
    rm -r /usr/lib/node_modules && \
    cd / && \
    npm --version

CMD ["node"]
