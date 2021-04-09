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

'use strict'
/*
  Usage: handle(function(body, context))
*/
const fs = require('fs')
const http = require('http')
const path = require('path')
const version = require('./package.json')
const fdkVersion = 'fdk-node/' + version.version + ' (njsv=' + process.version + ')'

const fnFunctionExceptionMessage = 'Exception in function, consult logs for details'

/**
 * The function handler  - This is a user-supplied node function that implements the behaviour of the current fn function
 *
 * @callback fnHandler
 * @param {string|Buffer} the input to the function - this is either a string or a buffer depending on the `inputMode` specified in `handle`
 * @param {Context} the Fn context object containing information about the request and how to process the response
 * @return {string|number|Promise|null|Response}
 */

/**
 * Asks the FDK to use the specified function to handle a request  this should be called exactly once per function on startup
 *
 *
 * @param fnfunction {fnHandler} the function to invoke
 * @param options {object}
 */
exports.handle = function (fnfunction, options) {
  const fnFormat = process.env.FN_FORMAT || ''
  let fdkHandler

  // format has been explicitly specified
  switch (fnFormat.toLowerCase()) {
    case 'http-stream':
      fdkHandler = handleHTTPStream
      break
    default:
      console.warn(
        `The Node.js FDK does not support the '${fnFormat}' format, change the function format to 'http-stream'. Exiting)`)
      process.exit(2)
  }

  return fdkHandler(fnfunction, options)
}

/**
 * A function result = this causes the handler wrapper to use a specific response writer
 */
class FnResult {
  writeResult (ctx, resp) {
    throw new Error('should be overridden')
  }
}

class StreamResult extends FnResult {
  constructor (stream) {
    super()
    this._stream = stream
  }

  writeResult (ctx, resp) {
    return new Promise((resolve, reject) => {
      this._stream.pipe(resp)
      this._stream.on('end', resolve)
      this._stream.on('error', reject)
    })
  }
}

class RawResult extends FnResult {
  constructor (raw) {
    super()
    this._raw = raw
  }

  writeResult (ctx, resp) {
    resp.write(this._raw)
  }
}

/**
 * Send a result from a function as a stream - use this function to wrap a stream and have
 * @param stream
 * @returns {StreamResult}
 */
exports.streamResult = function (stream) {
  return new StreamResult(stream)
}

/**
 * Send a raw result (either a string or a buffer) to the function response
 *
 * @param res {string|Buffer} the result
 * @returns {RawResult}
 */
exports.rawResult = function (res) {
  return new RawResult(res)
}

/**
 * Sends a JSON error to response, ending the interaction
 * @param resp {http.ServerResponse}
 * @param code {int}
 * @param error
 */
function sendJSONError (resp, code, error) {
  const errStr = JSON.stringify(error)

  console.warn(`Error ${code} : ${errStr}`)
  resp.setHeader('Content-type', 'application/json')
  resp.writeHead(code, 'internal error')
  resp.end(errStr)
}

/**
 *
 * Sends the result of a the function to the service
 * @param ctx {Context}
 * @param resp {http.ServerResponse}
 * @param result {*}
 */
function sendResult (ctx, resp, result) {
  const responseContentType = ctx.responseContentType
  let isJSON = false
  if (responseContentType == null && result != null) {
    ctx.responseContentType = 'application/json'
    isJSON = true
  } else if (responseContentType.startsWith('application/json') || responseContentType.indexOf('+json') > -1) {
    isJSON = true
  }

  const headers = ctx.responseHeaders
  for (const key in headers) {
    if (Object.prototype.hasOwnProperty.call(headers, key)) {
      resp.setHeader(key, headers[key])
    }
  }
  resp.removeHeader('Content-length')
  resp.setHeader('Fn-Fdk-Version', fdkVersion)
  resp.writeHead(200, 'OK')

  let p
  if (result != null) {
    if (result instanceof FnResult) {
      p = Promise.resolve(result.writeResult(ctx, resp))
    } else if (isJSON) {
      p = Promise.resolve(resp.write(JSON.stringify(result)))
    } else {
      p = Promise.resolve(resp.write(result))
    }
  }
  p.then(() => resp.end(), (err) => {
    console.log('error writing response data', err)
    resp.end()
  })

  return p
}

const skipHeaders = {
  TE: true,
  Connection: true,
  'Keep-Alive': true,
  'Transfer-Encoding': true,
  Trailer: true,
  Upgrade: true
}

class BufferInputHandler {
  constructor () {
    this._bufs = []
  }

  pushData (data) {
    this._bufs.push(Buffer.from(data))
  }

  getBody () {
    return Buffer.concat(this._bufs)
  }
}

class JSONInputHandler {
  constructor () {
    this._str = ''
  }

  pushData (data) {
    this._str += data
  }

  getBody () {
    try {
      return JSON.parse(this._str)
    } catch (e) {
      return this._str
    }
  }
}

class StringInputHandler {
  constructor () {
    this._str = ''
  }

  pushData (data) {
    this._str += data
  }

  getBody () {
    return this._str
  }
}

function getInputHandler (inputMode) {
  switch (inputMode) {
    case 'json' :
      return new JSONInputHandler()
    case 'string':
      return new StringInputHandler()
    case 'buffer':
      return new BufferInputHandler()
    default:
      throw new Error(`Unknown input mode "${inputMode}"`)
  }
}

function logFramer (ctx, fnLogframeName, fnLogframeHdr) {
  if ((fnLogframeName !== '') && (fnLogframeHdr !== '')) {
    const id = ctx.getHeader(fnLogframeHdr)
    if (id !== '') {
      console.log('\n' + fnLogframeName + '=' + id)
      console.error('\n' + fnLogframeName + '=' + id)
    }
  }
}

function handleHTTPStream (fnfunction, options) {
  const listenPort = process.env.FN_LISTENER
  const inputMode = options != null ? (options.inputMode || 'json') : 'json'

  if (listenPort == null || !listenPort.startsWith('unix:')) {
    console.error('Invalid configuration no FN_LISTENER variable set or invalid FN_LISTENER value', +listenPort)
    process.exit(2)
  }

  const listenFile = listenPort.substr('unix:'.length)
  const listenPath = path.dirname(listenFile)

  const tmpFileBaseName = path.basename(listenFile) + '.tmp'
  const tmpFile = listenPath + '/' + tmpFileBaseName

  const fnLogframeName = process.env.FN_LOGFRAME_NAME || ''
  const fnLogframeHdr = process.env.FN_LOGFRAME_HDR || ''

  const functionHandler = (req, resp) => {
    const inputHandler = getInputHandler(inputMode)

    if (req.method !== 'POST' || req.url !== '/call') {
      sendJSONError(resp, 400, { message: 'Invalid method', detail: `${req.method} ${req.url}` })
      return
    }

    req.on('data', chunk => {
      inputHandler.pushData(chunk)
    }).on('end', () => {
      const headers = {}
      const rawHeaders = req.rawHeaders
      for (let i = 0; i < rawHeaders.length; i += 2) {
        const k = canonHeader(rawHeaders[i])
        if (skipHeaders[k]) {
          continue
        }

        const v = rawHeaders[i + 1]
        if (headers[k] == null) {
          if (Array.isArray(v)) {
            headers[k] = v.slice()
          } else {
            headers[k] = [v]
          }
        } else {
          if (Array.isArray(v)) {
            headers[k] = headers[k].concat(v)
          } else {
            headers[k].push(v)
          }
        }
      }

      const body = inputHandler.getBody()
      const ctx = new Context(process.env, body, headers)
      logFramer(ctx, fnLogframeName, fnLogframeHdr)
      ctx.responseContentType = 'application/json'

      new Promise(function (resolve, reject) {
        try {
          return resolve(fnfunction(body, ctx))
        } catch (error) {
          reject(error)
        }
      }).then((result) => {
        return sendResult(ctx, resp, result)
      }, (error) => {
        console.warn('Error in function:', error)
        sendJSONError(resp, 502, { message: fnFunctionExceptionMessage, detail: error.toString() })
      })
    }).on('error', (e) => {
      sendJSONError(resp, 500, { message: 'Error sending response', detail: `${req.method} ${req.url} ${e.toString()}` })
    })
  }

  const currentServer = http.createServer(functionHandler)
  currentServer.keepAliveTimeout = 0 // turn off
  currentServer.listen(tmpFile, () => {
    fs.chmodSync(tmpFile, '666')

    fs.symlinkSync(tmpFileBaseName, listenFile)
  })

  currentServer.on('error', (error) => {
    console.warn(`Unable to connect to unix socket ${tmpFile}`, error)
    process.exit(3)
  })

  return () => {
    currentServer.close()
    fs.unlinkSync(listenFile)
  }
}

/**
 * Canonicalises an HTTP header
 * @param h {string}
 * @return {string}
 */
function canonHeader (h) {
  return h.replace(/_/g, '-').split('-').map((h) => {
    if (h) {
      const last = h.substr(1)
      const first = h.substr(0, 1)
      return first.toUpperCase() + last.toLowerCase()
    }
  }).join('-')
}

class HTTPGatewayContext {
  /**
   * Create an HTTP context
   * @param ctx {Context}
   */
  constructor (ctx) {
    this.ctx = ctx
    const _headers = {}
    for (const key in ctx.headers) {
      if (Object.prototype.hasOwnProperty.call(ctx.headers, key)) {
        if (key.startsWith('Fn-Http-H-') && key.length > 'Fn-Http-H-'.length) {
          const newKey = key.substr('Fn-Http-H-'.length)
          _headers[newKey] = ctx.headers[key]
        }
      }
    }
    this._headers = _headers
  }

  /**
   * returns the HTTP request URL for this event
   * @returns {string}
   */
  get requestURL () {
    return this.ctx.getHeader('Fn-Http-Request-Url')
  }

  /**
   * Returns the HTTP method for this event
   * @returns {string}
   */
  get method () {
    return this.ctx.getHeader('Fn-Http-Method')
  }

  /**
   * returns the HTTP headers reaceived by the gateway for this event
   * @returns {*}
   */
  get headers () {
    const headers = {}
    for (const k in this._headers) {
      if (Object.prototype.hasOwnProperty.call(this._headers, k)) {
        headers[k] = this._headers[k].slice()
      }
    }
    return headers
  }

  /**
   * Retuns a specific header or null if the header is not set - where multiple  values are present the first header is returned
   * @param key {string} the header key
   * @returns {string|null}
   */
  getHeader (key) {
    const h = this._headers[canonHeader(key)]
    if (h != null) {
      return h[0]
    }
    return null
  }

  /**
   * returns all header values for a given key
   * @param key {string}
   * @returns {Array.<string>}
   */
  getAllHeaderValues (key) {
    return this._headers[canonHeader(key)].slice(0) || []
  }

  /**
   * set the status code of the HTTP response
   * @param status {int}
   */
  set statusCode (status) {
    this.ctx.setResponseHeader('Fn-Http-Status', status)
  }

  /**
   * Sets a response header to zero or more values
   * @param key {string}
   * @param values {string}
   */
  setResponseHeader (key, ...values) {
    if (canonHeader(key) === 'Content-Type') {
      this.ctx.responseContentType = values[0]
    } else {
      this.ctx.setResponseHeader('Fn-Http-H-' + key, ...values)
    }
  }

  /**
   * Appends a response header to any existing values
   * @param key {string}
   * @param values {string}
   */
  addResponseHeader (key, ...values) {
    this.ctx.addResponseHeader('Fn-Http-H-' + key, ...values)
  }
}

/**
 * TraceContext defines an OCI APM tracing context for the current invocation.
 * Traces are currently defined by the Zipkin standard.
 * See: https://zipkin.io/pages/instrumenting
 */
class TraceContext {
  constructor (ctx) {
    this.isEnabled = parseInt(ctx._config.OCI_TRACING_ENABLED) === 1
    this.traceCollectorUrl = ctx._config.OCI_TRACE_COLLECTOR_URL
    this.traceId = ctx.getHeader('X-B3-TraceId')
    this.spanId = ctx.getHeader('X-B3-SpanId')
    this.parentSpanId = ctx.getHeader('X-B3-ParentSpanId')
    this.sampled = parseInt(ctx.getHeader('X-B3-Sampled')) === 1
    this.flags = parseInt(ctx.getHeader('X-B3-Flags')) === 1
  }
}

/**
 * Context is the function invocation context - it enables functions to read and write metadata from the request including event headers, config and the underlying payload
 */
class Context {
  constructor (config, payload, headers) {
    this._config = config
    this._body = payload
    this._headers = headers
    this._responseHeaders = {}
  }

  /**
   * Returns the deadline for the function invocation as a Date object
   * @returns {Date}
   */
  get deadline () {
    const deadStr = this.getHeader('Fn-Deadline')
    if (deadStr == null) {
      return null
    }
    return new Date(Date.parse(deadStr))
  }

  /**
   * returns the Fn Call ID associated with this call
   * @returns {string}
   */
  get callID () {
    return this.getHeader('Fn-Call-Id')
  }

  /**
   * Returns the application name associated with this function
   * @returns {string}
   */
  get appName () {
    return this._config.FN_APP_NAME
  }

  /**
   * Returns the application ID associated with this function
   * @returns {string}
   */
  get appID () {
    return this._config.FN_APP_ID
  }

  /**
   * Returns the function name associated with this function
   * @returns {string}
   */
  get fnName () {
    return this._config.FN_FN_NAME
  }

  /**
   * Returns the function ID associated with this function
   * @returns {string}
   */
  get fnID () {
    return this._config.FN_FN_ID
  }

  /**
   * Returns the amount of RAM (in MB) allocated to this function
   * @returns {int}
   */
  get memory () {
    return parseInt(this._config.FN_MEMORY)
  }

  /**
   * Returns the application configuration for this function
   * @returns {Object.<string,string>}
   */
  get config () {
    const c = {}
    Object.assign(c, this._config)
    return c
  }

  /**
   * Returns the raw body of the input to this function
   * @returns {*}
   */
  get body () {
    return this._body
  }

  /**
   * Returns the content type of the body (if set)
   * @returns {null|string}
   */
  get contentType () {
    return this.getHeader('Content-Type')
  }

  /**
   * returns a map of headers associated with this function this is an object containing key->[string] values
   * Header keys are always canonicalized to HTTP first-caps style

   * This returns a copy of the underlying headers, changes to the response value will not be reflected in the function response
   *
   * @returns {Object.<string,Array.<string>>}
   */
  get headers () {
    const headers = {}
    for (const k in this._headers) {
      if (Object.prototype.hasOwnProperty.call(this._headers, k)) {
        let value = this._headers[k]
        if (!Array.isArray(value)) {
          value = new Array(value)
        } else {
          value = value.slice()
        }
        headers[k] = value
      }
    }
    return headers
  }

  /**
   * Create an OCI APM TraceContext for the current invocation.
   */
  get traceContext () {
    return new TraceContext(this)
  }

  /**
   * returns a object containing the outbound  headers  associated with this function this is an object containing key->[string] values
   *
   * Header keys are always canonicalized to HTTP first-caps style
   *
   * This returns a copy of the underlying headers, changes to the response value will not be reflected in the function response
   *
   * @returns {Object.<string,Array.<string>>}
   */
  get responseHeaders () {
    const headers = {}
    Object.assign(headers, this._responseHeaders)
    return headers
  }

  /**
   * returns all header values for a given key
   * @param key {string}
   * @returns {Array.<string>}
   */
  getAllHeaderValues (key) {
    const v = this._headers[canonHeader(key)]

    if (v == null) {
      return []
    }
    return v.slice(0)
  }

  /**
   * Returns the first value of a given header or null
   * Header keys are compared using case-insensitive matching
   * @param key {string}
   * @returns {string|null}
   */
  getHeader (key) {
    const h = this._headers[canonHeader(key)]
    if (h != null) {
      return h[0]
    }
    return null
  }

  /**
   * Returns a config value for a given key
   * @param key  {string}
   * @returns {string|null}
   */
  getConfig (key) {
    return this._config.get(key)
  }

  /**
   * Returns the first value of a given header or null
   * Header keys are compared using case-insensitive matching
   * @param key {string}
   * @returns {string|null}
   */
  getResponseHeader (key) {
    const h = this._responseHeaders[canonHeader(key)]
    if (h != null) {
      return h[0]
    }
    return null
  }

  /**
   * Sets a response header to zero or more values
   * @param key {string}
   * @param values {string}
   */
  setResponseHeader (key, ...values) {
    this._responseHeaders[canonHeader(key)] = values
  }

  /**
   * Appends a response header to any existing values
   * @param key {string}
   * @param values {string}
   */
  addResponseHeader (key, ...values) {
    const ckey = canonHeader(key)
    if (this._responseHeaders[ckey] == null) {
      this._responseHeaders[ckey] = []
    }
    Array.prototype.push.apply(this._responseHeaders[ckey], values)
  }

  /**
   * Sets the response content type
   * @param contentType {string}
   */
  set responseContentType (contentType) {
    this.setResponseHeader('Content-Type', contentType)
  }

  /**
   * Gets the response content type
   * @returns {string|null}
   */
  get responseContentType () {
    return this.getResponseHeader('Content-Type')
  }

  /**
   * Returns the httpContext associated with this request
   * @returns {HTTPGatewayContext}
   */
  get httpGateway () {
    return new HTTPGatewayContext(this)
  }
}
