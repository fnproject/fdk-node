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
 * Node.js - Pure Dependency Resolution + Version Integrity
 *
 * Validates that common ecosystem libraries:
 *   lodash (pinned), express, axios, uuid, jsonwebtoken, mongodb, pg, redis, and @grpc/grpc-js
 * are present in the customer bundle and continue to work reliably after runtime/npm updates.
 *
 * The test asserts that each library:
 *  - loads via require() without module resolver regressions
 *  - performs a minimal, offline-safe operation
 *  - reports a stable package version for CI assertions
 *
 * Response JSON:
 * {
 *   "message": "node_pure_deps_and_versions",
 *   "libs": { "<name>": "ok|failed:*", ... },
 *   "versions": { "<name>": "<version>|failed:*", ... }
 * }
 *
 * Pinning:
 *  - lodash is expected to be pinned (e.g., 4.17.23) so the test can validate pinning behavior.
 *  - @fnproject/fdk is pinned (in package.json) so we can validate version integrity of the FDK itself.
 */
fdk.handle(async function (input, ctx) {
  const libs = {}
  const versions = {}

  function failVal (e) {
    const n = e && e.name ? e.name : 'Error'
    const m = e && e.message ? e.message : String(e)
    return `failed:${n}:${m}`
  }

  function setOk (name) { libs[name] = 'ok' }
  function setFail (name, e) { libs[name] = failVal(e) }

  // Read installed package version from its package.json
  function pkgVersion (pkgName) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const v = require(`${pkgName}/package.json`).version
      return v || 'failed:version_missing'
    } catch (e) {
      return failVal(e)
    }
  }

  // ----------------------------
  // @fnproject/fdk (pinned) – load + basic sanity
  // ----------------------------
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const f = require('@fnproject/fdk')
    if (!f || typeof f.handle !== 'function') throw new Error('unexpected_fdk_api')
    setOk('@fnproject/fdk')
  } catch (e) { setFail('@fnproject/fdk', e) }
  versions['@fnproject/fdk'] = pkgVersion('@fnproject/fdk')

  // ----------------------------
  // lodash (pinned) – basic op
  // ----------------------------
  try {
    const _ = require('lodash')
    const v = _.chunk([1, 2, 3, 4], 2)
    if (!Array.isArray(v) || v.length !== 2) throw new Error('unexpected_lodash_result')
    setOk('lodash')
  } catch (e) { setFail('lodash', e) }
  versions.lodash = pkgVersion('lodash')

  // ----------------------------
  // express – create app instance
  // ----------------------------
  try {
    const express = require('express')
    const app = express()
    if (typeof app !== 'function') throw new Error('unexpected_express_app')
    setOk('express')
  } catch (e) { setFail('express', e) }
  versions.express = pkgVersion('express')

  // ----------------------------
  // axios – create instance (no network)
  // ----------------------------
  try {
    const axios = require('axios')
    const inst = axios.create({ timeout: 1000 })
    if (!inst || !inst.defaults) throw new Error('unexpected_axios_instance')
    setOk('axios')
  } catch (e) { setFail('axios', e) }
  versions.axios = pkgVersion('axios')

  // ----------------------------
  // uuid – generate v4
  // ----------------------------
  try {
    const { v4: uuidv4 } = require('uuid')
    const id = uuidv4()
    if (!id || typeof id !== 'string') throw new Error('uuid_failed')
    setOk('uuid')
  } catch (e) { setFail('uuid', e) }
  versions.uuid = pkgVersion('uuid')

  // ----------------------------
  // jsonwebtoken – sign token (offline)
  // ----------------------------
  try {
    const jwt = require('jsonwebtoken')
    const token = jwt.sign({ sub: 'test' }, 'test_secret', { algorithm: 'HS256', expiresIn: '1h' })
    if (!token || typeof token !== 'string') throw new Error('jwt_sign_failed')
    setOk('jsonwebtoken')
  } catch (e) { setFail('jsonwebtoken', e) }
  versions.jsonwebtoken = pkgVersion('jsonwebtoken')

  // ----------------------------
  // mongodb – construct client (no connect)
  // ----------------------------
  try {
    const { MongoClient } = require('mongodb')
    const client = new MongoClient('mongodb://localhost:27017', { serverSelectionTimeoutMS: 100 })
    if (!client) throw new Error('mongodb_client_failed')
    setOk('mongodb')
  } catch (e) { setFail('mongodb', e) }
  versions.mongodb = pkgVersion('mongodb')

  // ----------------------------
  // pg – create client (no connect)
  // ----------------------------
  try {
    const { Client } = require('pg')
    const client = new Client({ host: 'localhost', port: 5432, user: 'u', password: 'p', database: 'd' })
    if (!client) throw new Error('pg_client_failed')
    setOk('pg')
  } catch (e) { setFail('pg', e) }
  versions.pg = pkgVersion('pg')

  // ----------------------------
  // redis – create client (do not connect)
  // ----------------------------
  try {
    const { createClient } = require('redis')
    const client = createClient({ url: 'redis://localhost:6379' })
    if (!client) throw new Error('redis_client_failed')
    setOk('redis')
  } catch (e) { setFail('redis', e) }
  versions.redis = pkgVersion('redis')

  // ----------------------------
  // grpc-js – credentials (offline)
  // ----------------------------
  try {
    const grpc = require('@grpc/grpc-js')
    const creds = grpc.credentials.createInsecure()
    if (!creds) throw new Error('grpc_creds_failed')
    setOk('grpc-js')
  } catch (e) { setFail('grpc-js', e) }
  versions['grpc-js'] = pkgVersion('@grpc/grpc-js')

  ctx.responseContentType = 'application/json'
  return {
    message: 'node_pure_deps_and_versions',
    libs,
    versions
  }
})
