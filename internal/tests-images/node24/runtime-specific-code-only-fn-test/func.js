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

/**
 * Node 24 Runtime-Specific Regression Test.
 *
 * Validates:
 *  - Execution on Node 24
 *  - globalThis.WebSocket is present (should be present on Node 24)
 *  - global fetch is present
 *  - Node 24 ABI line is correctly reported
 */

const fdk = require('@fnproject/fdk')

function v8Major () {
  const v8 = (process.versions && process.versions.v8) || ''
  const major = parseInt(String(v8).split('.')[0], 10)
  return Number.isFinite(major) ? major : -1
}

fdk.handle(async function (_input, ctx) {
  const results = {}

  try {
    ctx.responseContentType = 'application/json'

    const nodeVersion = process.versions && process.versions.node ? process.versions.node : ''
    const major = parseInt(String(nodeVersion).split('.')[0], 10)

    // Runtime guard
    if (major !== 24) {
      throw new Error(`Expected Node 24 runtime, got ${nodeVersion}`)
    }

    results.runtime = 'node24'
    results.node_version = nodeVersion

    // Feature present in Node 22 and Node 24
    results.fetch_present = (typeof fetch === 'function') ? 'ok' : 'missing'

    // Additional Node 24 runtime feature check
    results.websocket_global = (typeof globalThis.WebSocket === 'function') ? 'present' : 'absent'

    // ABI / modules version check
    const modulesStr = process.versions && process.versions.modules ? process.versions.modules : ''

    results.modules_abi = modulesStr
    results.v8_major = v8Major()

    results.node24_abi_check = (modulesStr === '137') ? 'ok' : `unexpected:${modulesStr}`

    results.status = (
      results.fetch_present === 'ok' &&
        results.websocket_global === 'present' &&
        results.node24_abi_check === 'ok'
    )
      ? 'ok'
      : 'failed'

    return results
  } catch (e) {
    ctx.responseContentType = 'application/json'
    results.status = 'failed'
    results.error = String(e && e.message ? e.message : e)
    return results
  }
})
