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

const fs = require('fs')
const fdk = require('@fnproject/fdk')

/**
 * Determines the operating system distribution by reading /etc/os-release.
 *
 * Returns a normalized identifier for the OS distribution, such as:
 *  - 'ol9' for Oracle Linux 9
 *  - a lowercase distribution name for other platforms
 *  - 'unknown_os' if the information cannot be determined
 */
function getOsDistribution () {
  try {
    const osInfo = fs.readFileSync('/etc/os-release', 'utf8').split('\n')

    let name
    let versionId

    for (const line of osInfo) {
      if (line.startsWith('NAME=')) {
        name = line.split('=')[1].replace(/"/g, '')
      } else if (line.startsWith('VERSION_ID=')) {
        versionId = line.split('=')[1].replace(/"/g, '')
      }
    }

    if (name && name.includes('Oracle Linux') && versionId && versionId.length > 0) {
      return `ol${versionId[0]}`
    }

    if (name) {
      return name.toLower()
    }
  } catch (e) {
    console.error(`Error reading OS distribution: ${e}`)
  }

  return 'unknown_os'
}

/**
 * Retrieves runtime environment details and returns a combined
 * runtime identifier string.
 *
 * Example format:
 *   node22.ol9
 */
function runtimeVersionHandler (input, ctx) {
  let runtimeVersion = ''

  try {
    // Use major version only: node22
    const major = process.versions.node.split('.')[0]
    const languageRuntimeVersion = `node${major}`
    const osDistribution = getOsDistribution()

    runtimeVersion = `${languageRuntimeVersion}.${osDistribution}`
    console.info(`Runtime version ${runtimeVersion}`)
  } catch (e) {
    console.info(`Error while determining runtime version: ${e}`)
  }

  // Return plain text in a stable raw format (no JSON serialization)
  return fdk.rawResult(runtimeVersion)
}

fdk.handle(runtimeVersionHandler)
