'use strict'
/*
  Usage: handle(function(body, context))
*/
let fs = require('fs')
let http = require('http')
let path = require('path')

const fnFunctionExceptionMessage = 'Exception in function--consult logs for details'

let returnShutdown = false

/**
 * The function handler  - This is a user-supplied funciton that imlpements the behaviour of the current Node function
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
  let fnFormat = process.env['FN_FORMAT'] || ''
  let fdkHandler

  // format has been explicitly specified
  switch (fnFormat.toLowerCase()) {
    case 'http-stream':
      fdkHandler = handleHTTPStream
      break
    default:
      console.warn(
        `The Node.js FDK does not support the '${fnFormat}' format, change the function format to 'http-stream'. Exiting')`)
      process.exit(2)
  }

  let shutDown = fdkHandler(fnfunction, options)
  if (returnShutdown) {
    return shutDown
  }
}

/**
 * Set the input mode for this function - this determines  how binary data is handled on input to the function
 *
 * @param mode {"buffer"|"string"}
 */
exports.setInputMode = function (mode) {

}

/**
 * A function result = this causes the handler wrapper to use a specific response writer
 */
class Result {
  // This returns thenable result
  constructor (writeFunc) {
    this._writeFunc = writeFunc
  }

  _fn_writeToStream (stream) {
    this._writeFunc(stream)
  }
}

function extractRequestBody (contentType, body) {
  // console.error("CT:", contentType, "BODY:", body)
  if (contentType != null && (contentType.toLowerCase().startsWith('application/json') || contentType.toLowerCase().indexOf('+json') > -1)) {
    if (body === '') {
      return null
    }
    return JSON.parse(body)
  }
  return body
}

/**
 * Sends a JSON error to response, ending the interaction
 * @param resp {http.ServerResponse}
 * @param code {int}
 * @param error
 */
function sendJSONError (resp, code, error) {
  let errStr = JSON.stringify(error)

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
  let responseContentType = ctx.responseContentType
  let isJSON = false
  if (responseContentType == null && result != null) {
    ctx.responseContentType = 'application/json'
    isJSON = true
  } else if (responseContentType.startsWith('application/json') || responseContentType.indexOf('+json') > -1) {
    isJSON = true
  }

  let headers = ctx.responseHeaders
  for (let key in headers) {
    if (headers.hasOwnProperty(key)) {
      resp.setHeader(key, headers[key])
    }
  }
  resp.removeHeader('Content-length')
  resp.writeHead(200, 'OK')

  if (result != null) {
    if (typeof result === 'object' && typeof result['_fn_writeToStream'] === 'function') {
      // function result
      result._fn_writeToStream(resp)
    } else if (isJSON) {
      resp.write(JSON.stringify(result))
    } else {
      resp.write(result)
    }
  }
  resp.end()
}

const skipHeaders = {
  'TE': true,
  'Connection': true,
  'Keep-Alive': true,
  'Transfer-Encoding': true,
  'Trailer': true,
  'Upgrade': true,
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

function handleHTTPStream (fnfunction, options) {
  let listenPort = process.env['FN_LISTENER']
  const inputMode = options != null ? (options['inputMode'] || 'json') : 'json'
  let inputHandler = getInputHandler(inputMode)

  if (listenPort == null || !listenPort.startsWith('unix:')) {
    console.warn('Invalid configuration no FN_LISTENER variable set or invalid FN_LISTENER value', +listenPort)
    process.exit(2)
  }

  let listenFile = listenPort.substr('unix:'.length)
  let listenPath = path.dirname(listenFile)

  let tmpFileBaseName = path.basename(listenFile) + '.tmp'
  let tmpFile = listenPath + '/' + tmpFileBaseName

  let functionHandler = (req, resp) => {
    if (req.method !== 'POST' || req.url !== '/call') {
      sendJSONError(resp, 400, {message: 'Invalid method', detail: `${req.method} ${req.url}`})
      return
    }

    req.on('data', chunk => {
      inputHandler.pushData(chunk)
    }).on('end', () => {
      let headers = {}
      let rawHeaders = req.rawHeaders
      for (let i = 0; i < rawHeaders.length; i += 2) {
        let k = canonHeader(rawHeaders[i])
        if (skipHeaders[k]) {
          continue
        }

        let v = rawHeaders[i + 1]
        if (headers[k] == null) {
          headers[k] = [v]
        } else {
          headers[k].push(v)
        }
      }

      let body = inputHandler.getBody()
      console.debug(`Request: ${JSON.stringify(process.env)}  headers: ${JSON.stringify(headers)}`)
      let ctx = new Context(process.env, body, headers)

      ctx.responseContentType = 'application/json'

      new Promise(function (resolve, reject) {
        try {

        } catch (error) {
          reject(error)
        }
        return resolve(fnfunction(body, ctx))
      }).then(function (result) {
        sendResult(ctx, resp, result)
      }, function (error) {
        console.warn('Error in function:', error)
        sendJSONError(resp, 502, {message: fnFunctionExceptionMessage, detail: error.toString()})
      })
    }).on('error', (e) => {
      sendJSONError(resp, 500, {message: 'Error sending response', detail: `${req.method} ${req.url} ${e.toString()}`})
    })
  }

  let currentServer = http.createServer(functionHandler)
    .listen(tmpFile, () => {
      fs.chmodSync(tmpFile, '666')
      fs.symlinkSync(tmpFileBaseName, listenFile)
      console.debug('FDK listening on ', listenFile)
    })
    .on('error', (error) => {
      console.warn('Unable to connect to unix socket', error)
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
      let last = h.substr(1)
      let first = h.substr(0, 1)
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
    let _headers = {}
    for (let key in ctx.headers) {
      if (ctx.headers.hasOwnProperty(key)) {
        if (key.startsWith('Fn-Http-H-') && key.length > 'Fn-Http-H-'.length) {
          let newKey = key.substr('Fn-Http-H-'.length)
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
    let headers = {}
    for (let k in this._headers) {
      if (this._headers.hasOwnProperty(k)) {
        headers[k] = new Array(this._headers[k])
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
    let h = this._headers[canonHeader(key)]
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
    this.ctx.setHeader('Fn-Http-Status', status)
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
  addRsponseHeader (key, ...values) {
    this.ctx.addResponseHeader('Fn-Http-H-' + key, ...values)
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
   * Returns the deadline for the funciton invocation as a Date object
   * @returns {Date}
   */
  get deadline () {
    let deadStr = this.getHeader('Fn-Deadline')
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
   * Returns the application  name associated with this function
   * @returns {string}
   */
  get appName () {
    return this._config['FN_APP_NAME']
  }

  /**
   * Returns the application ID associated with this function
   * @returns {string}
   */
  get appID () {
    return this._config['FN_APP_ID']
  }

  /**
   * Returns the function ID associated with this function
   * @returns {string}
   */
  get fnID () {
    return this._config['FN_FN_ID']
  }

  /**
   * Returns the amount of RAM (in MB) allocated to this function
   * @returns {int}
   */
  get memory () {
    return parseInt(this._config['FN_MEMORY'])
  }

  /**
   * Returns the application configuration for this function
   * @returns {Object.<string,string>}
   */
  get config () {
    let c = {}
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
    let headers = {}
    for (let k in this._headers) {
      if (this._headers.hasOwnProperty(k)) {
        headers[k] = new Array(this._headers[k])
      }
    }
    return headers
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
    let headers = {}
    Object.assign(headers, this._responseHeaders)
    return headers
  }

  /**
   * returns all header values for a given key
   * @param key {string}
   * @returns {Array.<string>}
   */
  getAllHeaderValues (key) {
    let v = this._headers[canonHeader(key)]

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
    let h = this._headers[canonHeader(key)]
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
    let h = this._responseHeaders[canonHeader(key)]
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
  addRsponseHeader (key, ...values) {
    let ckey = canonHeader(key)
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
