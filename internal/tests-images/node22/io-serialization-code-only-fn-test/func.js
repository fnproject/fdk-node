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
 * Validates FDK request handling and response serialization behavior
 * across different input types and runtime environments.
 *
 * This test exercises:
 *  - JSON payload parsing (valid and invalid input handling)
 *  - Plain text response generation
 *  - Binary-safe request handling and size reporting
 *  - Correct Content-Type propagation
 *
 * The goal is to ensure stable and consistent request/response
 * behavior across runtime and FDK updates.
 */
function ioSerializationHandler (input, ctx) {
  let raw = Buffer.alloc(0)
  let payload = {}

  try {
    if (Buffer.isBuffer(input)) {
      raw = input
      payload = raw.length ? JSON.parse(raw.toString('utf8')) : {}
    } else if (typeof input === 'string') {
      raw = Buffer.from(input, 'utf8')
      payload = input ? JSON.parse(input) : {}
    } else if (typeof input === 'object' && input !== null) {
      payload = input
      raw = Buffer.from(JSON.stringify(input), 'utf8')
    }
  } catch (e) {
    // Invalid JSON / encoding → treat as empty payload
    console.info('Error parsing payload')
    payload = {}
    raw = Buffer.alloc(0)
  }

  const mode = payload.mode || 'json'

  if (mode === 'text') {
    ctx.setResponseHeader('Content-Type', 'text/plain')
    return 'plain-text-response'
  }

  if (mode === 'binary') {
    ctx.setResponseHeader('Content-Type', 'application/json')
    return { binary_length: raw.length }
  }

  // Default JSON response
  ctx.setResponseHeader('Content-Type', 'application/json')
  return {
    message: 'json-response',
    payload
  }
}

fdk.handle(ioSerializationHandler)
