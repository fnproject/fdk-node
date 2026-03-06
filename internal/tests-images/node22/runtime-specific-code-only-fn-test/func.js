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

const fdk = require('@fnproject/fdk')

/**
 * Node 22 Runtime-Specific Regression Test
 *
 * Validates runtime-specific behavior for Code-Only Functions on the Node 22 runtime.
 *
 * Ensures that:
 *   - The function is executing on the expected Node 22 major version
 *   - Modern shared runtime features (e.g., global fetch) are available
 *   - The Node 24–specific ABI discriminator (modules ABI 137) is absent
 *   - The expected Node 22 ABI line (modules ABI 127) is correctly reported
 *
 * This test guarantees correct runtime image selection, ABI stability for
 * native modules, and stable, contract-compliant JSON output across supported
 * application shapes.
 */
function majorNodeVersion () {
  const v = String(process.versions?.node || '')
  return v.split('.')[0]
}

fdk.handle(async function (input, ctx) {
  const results = {}

  try {
    // Return plain JSON object, not Fn response envelope
    ctx.responseContentType = 'application/json'

    // ------------------------------------------------------------
    // Runtime guard: must be Node 22
    // ------------------------------------------------------------
    const major = majorNodeVersion()
    if (major !== '22') {
      throw new Error(`Expected Node 22 runtime, got node=${process.versions.node}`)
    }
    results.runtime = 'node22'

    // ------------------------------------------------------------
    // Feature present in both Node 22 and Node 24
    // ------------------------------------------------------------
    results.fetch_present = (typeof fetch === 'function') ? 'ok' : 'missing'

    // ------------------------------------------------------------
    // Node 24-only discriminator (ABI line): must be ABSENT on Node 22
    // Node 22 => modules "127"
    // Node 24 => modules "137"
    // ------------------------------------------------------------
    results.modules_abi = String(process.versions?.modules || '')
    results.napi = String(process.versions?.napi || '')
    results.v8 = String(process.versions?.v8 || '')

    if (results.modules_abi === '137') {
      results.node24_abi_feature = 'unexpectedly_present'
    } else {
      results.node24_abi_feature = 'absent'
    }

    results.node22_abi_check = (results.modules_abi === '127') ? 'ok' : `unexpected:${results.modules_abi}`

    const ok =
        results.fetch_present === 'ok' &&
        results.node24_abi_feature === 'absent' &&
        results.node22_abi_check === 'ok'

    results.status = ok ? 'ok' : 'failed'
    return results
  } catch (e) {
    ctx.responseContentType = 'application/json'
    results.status = 'failed'
    results.error = String(e?.message || e)
    return results
  }
})
