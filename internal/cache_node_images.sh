#!/usr/bin/env bash
set -ex

# Artifactory functions as a caching proxy for DockerHub. Hence any image pulled from dockerhub will be cached in artifactory.
# The cached images will be removed as part of cleanup if not downloaded again within a particular time frame, currently set to 6 days.
# Hence, one may encounter rate limiting issue while accessing the node docker images which are not present in artifactory.
# In order to resolve the rate limiting issue, the below script helps to pull the node images from docker hub and cache them in artifactory.

# Node 11
docker pull docker-remote.artifactory.oci.oraclecorp.com/node:11.15.0-alpine

# Node 9 for unit test execution
docker pull docker-remote.artifactory.oci.oraclecorp.com/node:9-alpine
