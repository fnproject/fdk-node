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
 * Test for function behavior, including error, success, and panic scenarios.
 * Ensures consistent handling of success, error, and panic responses
 * across runtime versions. Validates the FDK's error mapping for
 * various modes: success, error, and panic.
 *
 * The name of the handler function file is different from the default
 * handler name to test if the updated file name is accepted,
 * provided the same name is mentioned in the Entrypoint in Dockerfile.
 */
function handler (input, ctx) {
  let payload = {}

  try {
    // Treat invalid JSON/UTF-8 as {}
    if (input == null) {
      payload = {}
    } else if (typeof input === 'object') {
      payload = input
    } else {
      payload = JSON.parse(input.toString())
    }
  } catch (e) {
    console.info(`Error parsing payload: ${e && e.message ? e.message : String(e)}`)
    payload = {}
  }

  const mode = payload.mode || 'success'

  // Ensure the response is emitted as JSON (FDK will serialize returned objects)
  ctx.responseContentType = 'application/json'

  if (mode === 'success') {
    return { status: 'ok', path: 'success' }
  }

  if (mode === 'error') {
    // Simulated ERROR behaviour (maps to FDK error response)
    throw new Error('simulated_error')
  }

  if (mode === 'panic') {
    // Simulated PANIC behaviour with a distinct error name
    const err = new Error('simulated_panic')
    err.name = 'RuntimeError'
    throw err
  }

  // Default fallback (unknown_mode)
  return { status: 'unknown_mode' }
}

fdk.handle(handler)
