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
const fs = require('fs')
const dns = require('dns').promises
const https = require('https')
const crypto = require('crypto')

const TLS_PROBE_HOST = 'identity.us-ashburn-1.oci.oraclecloud.com'
const TLS_PROBE_URL = `https://${TLS_PROBE_HOST}`

// Locale derivation (common runtime env pattern): LC_ALL -> LC_CTYPE -> LANG -> "unknown"
function envLocale () {
  return process.env.LC_ALL || process.env.LC_CTYPE || process.env.LANG || 'unknown'
}

// Seconds east of UTC, derived from local timezone offset
function tzOffsetSecondsEastOfUtc () {
  // JS getTimezoneOffset() returns minutes WEST of UTC; negate to get EAST of UTC seconds.
  return -new Date().getTimezoneOffset() * 60
}

// TLS verification probe: treat any HTTPS response (including 401/403/404) as success.
// If TLS handshake/cert verification fails, the request errors.
function httpsProbe (url, timeoutMs) {
  return new Promise((resolve) => {
    const req = https.get(
      url,
      {
        timeout: timeoutMs
      },
      (res) => {
        // Drain response to free socket
        res.resume()
        resolve(true)
      }
    )

    req.on('timeout', () => {
      req.destroy(new Error('timeout'))
    })

    req.on('error', (err) => {
      console.info(`TLS probe failed: ${err && err.message ? err.message : String(err)}`)
      resolve(false)
    })
  })
}

// libc presence check (file existence only)
function libcExists () {
  const candidates = [
    '/lib64/libc.so.6',
    '/lib/x86_64-linux-gnu/libc.so.6',
    '/usr/lib64/libc.so.6'
  ]
  return candidates.some((p) => fs.existsSync(p))
}

// Attempts to write/delete a small file under dirPath.
// Returns a stable structure for CI assertions.
function tryWrite (dirPath) {
  const probe = `${dirPath}/.sandbox_probe_${crypto.randomUUID().replace(/-/g, '')}.txt`
  try {
    fs.writeFileSync(probe, 'probe', { encoding: 'utf8' })
    return { path: dirPath, write: 'ok' }
  } catch (e) {
    return {
      path: dirPath,
      write: 'failed',
      error: e && e.message ? e.message : String(e)
    }
  } finally {
    try {
      if (fs.existsSync(probe)) fs.unlinkSync(probe)
    } catch (cleanupErr) {
      console.info(`sandbox cleanup failed for ${probe}: ${cleanupErr}`)
    }
  }
}

/**
 * OS-Level Regression & Security/Sandbox Compatibility Tests (Node.js).
 *
 * Validates that runtime image updates do not introduce regressions in:
 *  - time/locale/tzdata behavior (time_locale_tz)
 *  - system library presence and outbound TLS usability (syslib_check)
 *  - DNS resolution and outbound TLS connectivity (dns_tls_check)
 *  - execution context identity (uid_gid_env)
 *  - filesystem encoding semantics via /tmp (fs_encoding)
 *  - filesystem boundary enforcement (sandbox_fs_boundary):
 *    restricted path writes must fail; /tmp must remain writable
 */
fdk.handle(async function (input, ctx) {
  const results = {}

  const tlsOk = await httpsProbe(TLS_PROBE_URL, 3000)

  // 1) Time, Locale & tzdata
  try {
    results.time_locale_tz = {
      local_time: new Date().toISOString(), // stable ISO format
      utc_time: new Date().toISOString(), // Date.toISOString is UTC
      locale: envLocale(),
      tz_offset: tzOffsetSecondsEastOfUtc()
    }
  } catch (e) {
    results.time_locale_tz = { error: e && e.message ? e.message : String(e) }
  }

  // 2) System Library & TLS usability
  try {
    results.syslib_check = {
      libc: libcExists() ? 'ok' : 'failed:libc_not_found',
      openssl: tlsOk ? 'ok' : 'failed:tls_unusable'
    }
  } catch (e) {
    results.syslib_check = { error: e && e.message ? e.message : String(e) }
  }

  // 3) DNS + TLS
  try {
    let dnsStatus = 'ok'
    try {
      await dns.lookup(TLS_PROBE_HOST)
    } catch (e) {
      dnsStatus = 'failed'
      console.info(`DNS probe failed: ${e && e.message ? e.message : String(e)}`)
    }

    results.dns_tls_check = {
      dns: dnsStatus,
      tls: tlsOk ? 'ok' : 'failed'
    }
  } catch (e) {
    results.dns_tls_check = { error: e && e.message ? e.message : String(e) }
  }

  // 4) Execution context identity
  try {
    results.uid_gid_env = {
      uid: typeof process.getuid === 'function' ? process.getuid() : -1,
      gid: typeof process.getgid === 'function' ? process.getgid() : -1,
      cwd: process.cwd()
    }
  } catch (e) {
    results.uid_gid_env = { error: e && e.message ? e.message : String(e) }
  }

  // 5) Filesystem encoding in /tmp + cleanup
  try {
    const filename = '/tmp/unicode_à_ö_漢字.txt'
    let fsStatus = 'unknown'

    try {
      fs.writeFileSync(filename, 'test', { encoding: 'utf8' })
      const content = fs.readFileSync(filename, { encoding: 'utf8' })
      fsStatus = content === 'test' ? 'ok' : 'mismatch'
    } catch (e) {
      fsStatus = `failed:${e && e.message ? e.message : String(e)}`
    } finally {
      try {
        if (fs.existsSync(filename)) fs.unlinkSync(filename)
      } catch (cleanupErr) {
        console.info(`fs cleanup failed for ${filename}: ${cleanupErr}`)
      }
    }

    results.fs_encoding = { status: fsStatus }
  } catch (e) {
    results.fs_encoding = { error: e && e.message ? e.message : String(e) }
  }

  // 6) Sandbox filesystem boundary (writes)
  // In constrained environments, /tmp is typically writable; system paths should be restricted.
  try {
    results.sandbox_fs_boundary = {
      allowed_write: [tryWrite('/tmp')],
      restricted_write: [
        tryWrite('/'),
        tryWrite('/etc'),
        tryWrite('/root'),
        tryWrite('/var'),
        tryWrite('/usr'),
        tryWrite('/bin'),
        tryWrite('/lib'),
        tryWrite('/lib64'),
        tryWrite('/proc'),
        tryWrite('/sys')
      ]
    }
  } catch (e) {
    results.sandbox_fs_boundary = { error: e && e.message ? e.message : String(e) }
  }

  // Explicit response headers for protocol/serialization consistency
  ctx.responseContentType = 'application/json'
  return results
})
