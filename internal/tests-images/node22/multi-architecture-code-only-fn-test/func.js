/*
 * Copyright (c) 2019, 2020 Oracle and/or its affiliates. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const os = require('os')
const fdk = require('@fnproject/fdk')

/**
 * Multi-Architecture Manifest Validation Test.
 *
 * Determines the CPU architecture of the executing runtime
 * and returns a normalized identifier.
 *
 * Expected outputs:
 *  - "X86" for x86_64 / amd64
 *  - "ARM" for arm64 / aarch64
 *  - Raw architecture string for any other platform
 */
function multiArchHandler (input, ctx) {
  const arch = os.arch().toLowerCase()

  if (arch === 'x64' || arch === 'amd64') {
    return fdk.rawResult('X86')
  }

  if (arch === 'arm64' || arch === 'aarch64') {
    return fdk.rawResult('ARM')
  }

  return fdk.rawResult(arch)
}

fdk.handle(multiArchHandler)
