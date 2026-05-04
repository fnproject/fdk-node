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

ARG FDK_VERSION

# Install Node.js
RUN microdnf module enable nodejs:24 && \
    microdnf install -y --setopt=tsflags=nodocs nodejs npm && \
    microdnf module reset nodejs:24 && \
    microdnf clean all && \
    rm -rf /var/cache/dnf

# Runtime user (consistent with existing runtime image)
RUN groupadd --gid 1000 fn && adduser --uid 1000 --gid fn fn

# The NPM version we get from the OS isn't necessarily up to date & may have insecure dependencies. We can use it to install the latest NPM version though. \
# The new npm will be installed in /usr/local/lib and the the original is in /usr/lib and can now be removed
# Finally, we verify the new npm installation
RUN npm --registry=https://artifactory.oci.oraclecorp.com/api/npm/global-release-npm \
      install -g npm@11.13.0 && \
    rm -rf /usr/lib/node_modules && \
    npm cache clean --force && \
    npm --version

# Copy the prebuilt Node.js FDK tarball into a temporary location
# Expected in build context:
#   fnproject-fdk-${FDK_VERSION}.tgz
COPY fnproject-fdk-${FDK_VERSION}.tgz /tmp/

# --------------------------------------------------------------------
# Install the pre-built Fn Project Node.js FDK from the provided FDK tarball.
# This bakes the FDK and its runtime dependencies into the image at build time,
# so no dependency installation is required at function invocation time.
# --------------------------------------------------------------------
RUN mkdir -p /opt/function && \
    npm --registry=https://artifactory.oci.oraclecorp.com/api/npm/global-release-npm \
      install --prefix /opt/function /tmp/fnproject-fdk-${FDK_VERSION}.tgz && \
    rm -f /tmp/fnproject-fdk-${FDK_VERSION}.tgz && \
    npm cache clean --force && \
    chmod -R o+r /opt/function

# --------------------------------------------------------------------
# Module resolution order:
# 1) Customer deps (/function/node_modules)
# 2) Prebaked FDK fallback (/opt/function/node_modules)
# --------------------------------------------------------------------
ENV NODE_PATH=/function/node_modules:/opt/function/node_modules

CMD ["node"]