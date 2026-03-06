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

function failVal (e) {
  const n = e && e.name ? e.name : 'Error'
  const m = e && e.message ? e.message : String(e)
  return `failed:${n}:${m}`
}
function ok () { return 'ok' }

// Version helper (works for normal + scoped packages)
function readVersion (pkgName) {
  return require(`${pkgName}/package.json`).version
}

fdk.handle(async function combinedNativeHandler (input, ctx) {
  ctx.setResponseHeader('Content-Type', 'application/json')

  const libs = {

    // custom addon
    customer_native_addon: 'failed:not_run'
  }

  // Versions map for CI assertions (bcrypt pinned in package.json)
  const versions = {
    customer_native_addon: 'failed:not_run'
  }

  // ----------------------------
  // Custom customer addon (prebuilds via node-gyp-build)
  // Expected exports: add(a,b)
  // ----------------------------
  try {
    const addon = require('customer-native-addon')
    const sum = addon.add(1, 2)
    if (sum !== 3) throw new Error(`customer_native_addon_add_failed:${sum}`)
    libs.customer_native_addon = ok()
    versions.customer_native_addon = readVersion('customer-native-addon')
  } catch (e) {
    libs.customer_native_addon = failVal(e)
    try { versions.customer_native_addon = readVersion('customer-native-addon') } catch (e2) { versions.customer_native_addon = failVal(e2) }
  }

  return {
    message: 'node_native_addons_and_custom_prebuilds',
    libs,
    versions
  }
})
