#!/bin/bash
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

set -ex

# ensure working dir is clean
git status
if [[ -z $(git status -s) ]]
then
  echo "tree is clean"
else
  echo "tree is dirty, please commit changes before running this"
  exit 1
fi

git pull

version_file="package.json"
current_version=$(cat ${version_file} | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[\",]//g' | tr -d '[[:space:]]')
echo "Current version: $current_version"

# Calculate new/release version
version_parts=(${current_version//./ })
new_minor=$((${version_parts[2]}+1))
new_version="${version_parts[0]}.${version_parts[1]}.$new_minor"

if [[ ${new_version} =~  ^[0-9]+\.[0-9]+\.[0-9]+$ ]] ; then
   echo "New/Release version: $new_version"
else
   echo "Invalid Release version: $new_version"
   exit 1
fi

./internal/release/update_version_fdk_npm_pkg.sh $new_version || true

tag="$new_version"
git add -u
git commit -m "FDK Node: $new_version version release"
git tag -f -a $tag -m "version $new_version"
git push
git push origin $tag
