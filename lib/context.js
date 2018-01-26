'use strict'

class Config {
  constructor (map) {
    this.properties = map
  }

  get (key) {
    return this.properties[key]
  }
}

function canonHeader (h) {
  return h.replace('_', '-').split('-').map((h) => {
    if (h) {
      let last = h.substr(1)
      let first = h.substr(0, 1)
      return first.toUpperCase() + last.toLowerCase()
    }
  }).join('-')
}

class HttpProtocol {
  constructor (payload, out) {
    this.payload = payload
    this.out = out
  }

  get type () {
    return 'http'
  }

  get requestUrl () {
    return this.payload.requestUrl
  }

  get method () {
    return this.payload.method
  }

  get headers () {
    return this.payload.headers
  }

  header (key) {
    let val = this.payload.headers[canonHeader(key)]
    if (val) {
      return val[0]
    }
    return null
  }

  setStatusCode (status) {
    this.out.status_code = status
  }

  setOutputHeader (k, v) {
    this.out.headers[canonHeader(k)] = [v]
  }

  addOutputHeader (k, v) {
    let canHeader = canonHeader(k)
    if (this.out.headers[canHeader]) {
      this.out.headers[canHeader] = [v]
    } else {
      this.out.headers[canHeader].push(v)
    }
  }
}

class Context {
  constructor (config, payload, proto, ctxout) {
    this.config = config
    this.payload = payload
    this._proto = proto
  }

  get deadline () {
    return this.payload.deadline
  }

  get callId () {
    return this.payload.call_id
  }

  get appName () {
    return this.payload.app_name
  }

  get path () {
    return this.payload.path
  }

  get format () {
    return this.payload.format
  }

  get memory () {
    return this.payload.memory
  }

  get type () {
    return this.payload.type
  }

  get body () {
    return this.payload.body
  }

  get contentType () {
    return this.payload.content_type || ''
  }

  get protocol () {
    return this._proto
  }

  getConfig (key) {
    console.log("getting " ,key , " from ",this.config.properties)
    return this.config.get(key)
  }

  set responseContentType (contentType) {
    out.content_type = contentType
  }
}

class DefaultContext extends Context {
  constructor (body, env, outctx) {
    let configProperties = {}
    let payload = {
      content_type : '',
      body: body
    }
    let protoProperties = {headers: {}}

    for (let propertyName in env) {
      if (env.hasOwnProperty(propertyName)) {
        let ctxKey = propertyName
        let val = env[propertyName]
        const headerPrefix = 'FN_HEADER_'
        if (propertyName.startsWith(headerPrefix)) {
          let header = canonHeader(propertyName.substr(headerPrefix.length))
          if (header === 'Fn-Deadline'){
            payload.deadline = env[propertyName]
          }else{
            protoProperties.headers[header] = [val]
            if (header === 'Content-Type') {
              payload.content_type = val
            }

          }
        } else if (propertyName === 'FN_METHOD') {
          protoProperties.method = val
        } else if (propertyName === 'FN_REQUEST_URL') {
          protoProperties.request_url = val
        } else if (propertyName === 'FN_MEMORY') {
          payload.memory = parseInt(env[propertyName])
        } else if (propertyName.startsWith('FN_')) {
          ctxKey = propertyName.substr(3, propertyName.length - 1).toLowerCase()
          payload[ctxKey] = env[propertyName]
        } else {
          configProperties[ctxKey] = env[propertyName]
        }
      }
    }

    super(
      new Config(configProperties),
      payload,
      new HttpProtocol(protoProperties, {}),
      outctx)
  }
}

class JSONContext extends Context {
  constructor (env, request, outctx, proto_outctx) {
    let configProperties = {}
    // header properties
    let headers = request.protocol.headers
    let payload = request
    let protoProperties = {
      headers: {}
    }

    for (let propertyName in headers) {
      if (headers.hasOwnProperty(propertyName)) {
        let ch = canonHeader(propertyName)
        let val = headers[propertyName]
        if (ch === 'Fn-Deadline') {
          payload.deadline = val
        } else if (ch === 'Fn-Method') {
          protoProperties.method = val
        } else if (ch.startsWith('Fn-')) {
        } else {
          protoProperties.headers[ch] = val
        }
      }
    }

    super(new Config(configProperties), payload, new HttpProtocol(protoProperties, proto_outctx),
          outctx)
  }
}

module.exports.DefaultContext = DefaultContext
module.exports.JSONContext = JSONContext
