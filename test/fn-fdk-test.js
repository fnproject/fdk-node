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
const http = require('http')
const tmp = require('tmp')
const test = require('tape')
const path = require('path')
const fs = require('fs')
const rewire = require('rewire')
const sinon = require('sinon')

test('print logFramer', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  const logFake = sinon.fake()
  const errorFake = sinon.fake()
  fdk.__set__({
    process: {
      env: {
        FN_FORMAT: 'http-stream',
        FN_LISTENER: 'unix:' + socketFile,
        FN_MEMORY: '128',
        FN_LOGFRAME_NAME: 'foo',
        FN_LOGFRAME_HDR: 'Fn-Call-Id'
      },
      exit: function () {
        throw new Error('got exit')
      }
    },
    console: {
      log: logFake,
      error: errorFake
    }
  })
  const cleanup = fdk.handle((input, ctx) => {
    t.equals('callId', ctx.callID)
    t.equals('callId', ctx.getHeader('Fn-Call-Id'))

    ctx.responseContentType = 'text/plain'
    const z = ctx.httpGateway
    z.statusCode = 200
    return '\n' + ctx.config.FN_LOGFRAME_NAME + '=' + ctx.getHeader('Fn-Call-Id')
  })

  onSocketExists(socketFile)
    .then(() => {
      return request({
        socketPath: socketFile,
        path: '/call',
        host: 'localhost',
        method: 'POST',
        headers: {
          'Fn-Call-Id': 'callId'
        }
      }).then(r => {
        t.equals(r.body, '\nfoo=callId')
        t.equals(r.resp.headers['fn-http-status'], '200')
        t.ok(logFake.calledWith('\nfoo=callId'))
        t.ok(errorFake.calledWith('\nfoo=callId'))
        t.end()
      })
    })
    .then(cleanup)
    .then(() => socketFile.removeCallback)
    .catch(e => t.fail(e))
})

test('reject missing format env ', function (t) {
  const fdk = rewire('../fn-fdk.js')
  fdk.__set__(
    {
      process: {
        env: {
          FN_LISTENER: 'unix:/tmp/foo.sock'
        },
        exit: function (code) {
          t.equals(code, 2)
          throw new Error('got exit')
        }
      }
    })
  try {
    fdk.handle(null)
    t.fail()
  } catch (e) {
    t.end()
  }
})

test('reject missing listener  env ', function (t) {
  const fdk = rewire('../fn-fdk.js')
  fdk.__set__(
    {
      process: {
        env: {
          FN_FORMAT: 'http-stream'
        },
        exit: function (code) {
          t.equals(code, 2)
          throw new Error('got exit')
        }
      }
    })
  try {
    fdk.handle(null)
    t.fail()
  } catch (e) {
    t.end()
  }
})

test('reject invalid format', function (t) {
  const fdk = rewire('../fn-fdk.js')
  fdk.__set__(
    {
      process: {
        env: {
          FN_FORMAT: ''
        },
        exit: function (code) {
          t.equals(code, 2)
          throw new Error('got exit')
        }
      }
    })
  try {
    fdk.handle(null)
    t.fail()
  } catch (e) {
    t.end()
  }
})

test('Listens and accepts request', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  const cleanup = fdk.handle((input, ctx) => {
    t.equals('callId', ctx.callID)
    t.equals(deadline.toString(), ctx.deadline.toString())
    t.equals('fnId', ctx.fnID)
    t.equals('appId', ctx.appID)
    t.equals('fnName', ctx.fnName)
    t.equals('appName', ctx.appName)
    t.equals('h1', ctx.getHeader('my-header'))

    t.deepEquals(['h1', 'h2'], ctx.getAllHeaderValues('my-header'))
    const heads = ctx.headers
    t.deepEquals(['h1', 'h2'], heads['My-Header'])
    t.deepEquals(['h3'], heads.Otherheader)

    // Should contain the 'defaultSetup'' tracingContext.
    const tracingCxt = ctx.tracingContext
    t.deepEquals(false, tracingCxt.isEnabled)
    t.deepEquals(undefined, tracingCxt.traceCollectorUrl)
    t.deepEquals(null, tracingCxt.traceId)
    t.deepEquals(null, tracingCxt.spanId)
    t.deepEquals(null, tracingCxt.parentSpanId)
    t.deepEquals(false, tracingCxt.sampled)
    t.deepEquals(null, tracingCxt.flags)
    t.deepEquals('appname::fnname', tracingCxt.serviceName)

    ctx.responseContentType = 'text/plain'

    const z = ctx.httpGateway

    z.setResponseHeader('My-Out-Header', 'out')
    z.statusCode = 302

    return 'done'
  })

  onSocketExists(socketFile)
    .then(() => {
      return request({
        socketPath: socketFile,
        path: '/call',
        host: 'localhost',
        method: 'POST',
        headers: {
          'Fn-Call-Id': 'callId',
          'Fn-Deadline': deadline.toString(),
          'My-Header': ['h1', 'h2'],
          otherHeader: 'h3'
        }
      }).then(r => {
        t.equals(r.body, 'done')
        t.equals(r.resp.headers['fn-http-h-my-out-header'], 'out')
        t.equals(r.resp.headers['fn-http-status'], '302')
        t.match(r.resp.headers['fn-fdk-version'], /fdk-node\/\d+\.\d+\.\d+ \(njsv=v\d+.\d+.\d+\)/)
        t.match(r.resp.headers['fn-fdk-runtime'], /node\/\d+\.\d+\.\d+/)
        t.end()
      })
    })
    .then(cleanup)
    .then(() => socketFile.removeCallback)
    .catch(e => t.fail(e))
})

test('Listens and accepts tracing request', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(tracingSetup(socketFile))

  const deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  const cleanup = fdk.handle((input, ctx) => {
    t.equals('callId', ctx.callID)
    t.equals(deadline.toString(), ctx.deadline.toString())
    t.equals('fnId', ctx.fnID)
    t.equals('appId', ctx.appID)
    t.equals('fnName', ctx.fnName)
    t.equals('appName', ctx.appName)
    t.equals('h1', ctx.getHeader('my-header'))

    t.deepEquals(['h1', 'h2'], ctx.getAllHeaderValues('my-header'))
    const heads = ctx.headers
    t.deepEquals(['h1', 'h2'], heads['My-Header'])
    t.deepEquals(['h3'], heads.Otherheader)

    // Should contain the 'tracingSetup' tracingContext.
    const tracingCxt = ctx.tracingContext
    t.deepEquals(true, tracingCxt.isEnabled)
    t.deepEquals('trace-collector-url', tracingCxt.traceCollectorUrl)
    t.deepEquals('canned-trace-id', tracingCxt.traceId)
    t.deepEquals('canned-span-id', tracingCxt.spanId)
    t.deepEquals('canned-parent-span-id', tracingCxt.parentSpanId)
    t.deepEquals(true, tracingCxt.sampled)
    t.deepEquals('1', tracingCxt.flags)
    t.deepEquals('appname::fnname', tracingCxt.serviceName)

    ctx.responseContentType = 'text/plain'

    const z = ctx.httpGateway

    z.setResponseHeader('My-Out-Header', 'out')
    z.statusCode = 302

    return 'done'
  })

  onSocketExists(socketFile)
    .then(() => {
      return request({
        socketPath: socketFile,
        path: '/call',
        host: 'localhost',
        method: 'POST',
        headers: {
          'Fn-Call-Id': 'callId',
          'Fn-Deadline': deadline.toString(),
          'My-Header': ['h1', 'h2'],
          otherHeader: 'h3',
          // Test canned tracing headers
          'X-B3-TraceId': 'canned-trace-id',
          'X-B3-SpanId': 'canned-span-id',
          'X-B3-ParentSpanId': 'canned-parent-span-id',
          'X-B3-Sampled': '1',
          'X-B3-Flags': '1'

        }
      }).then(r => {
        t.equals(r.body, 'done')
        t.equals(r.resp.headers['fn-http-h-my-out-header'], 'out')
        t.equals(r.resp.headers['fn-http-status'], '302')
        t.match(r.resp.headers['fn-fdk-version'], /fdk-node\/\d+\.\d+\.\d+ \(njsv=v\d+.\d+.\d+\)/)
        t.match(r.resp.headers['fn-fdk-runtime'], /node\/\d+\.\d+\.\d+/)
        t.end()
      })
    })
    .then(cleanup)
    .then(() => socketFile.removeCallback)
    .catch(e => t.fail(e))
})

test('handle exception from function', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const cleanup = fdk.handle((input, ctx) => {
    throw Error('Exception in function')
  })

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile))
        .then(r => {
          t.equals(r.resp.statusCode, 502)
          t.equals(r.resp.headers['content-type'], 'application/json')
          t.deepEquals(JSON.parse(r.body).message, 'Exception in function, consult logs for details')
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('Listens and accepts request', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  const cleanup = fdk.handle((input, ctx) => {
    t.equals('callId', ctx.callID)
    t.equals(deadline.toString(), ctx.deadline.toString())
    t.equals('fnId', ctx.fnID)
    t.equals('appId', ctx.appID)
    t.equals('h1', ctx.getHeader('my-header'))
    t.deepEquals(['h1', 'h2'], ctx.getAllHeaderValues('my-header'))

    ctx.setResponseHeader('My-Out-Header', 'out')
    ctx.responseContentType = 'text/plain'
    return 'done'
  })

  onSocketExists(socketFile)
    .then(() => {
      return request({
        socketPath: socketFile,
        path: '/call',
        host: 'localhost',
        method: 'POST',
        headers: {
          'Fn-Call-Id': 'callId',
          'Fn-Deadline': deadline.toString(),
          'My-Header': ['h1', 'h2']
        }
      }).then(r => {
        t.equals(r.body, 'done')
        t.equals(r.resp.headers['my-out-header'], 'out')
        t.end()
      })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle multiple requests', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const cleanup = fdk.handle((input, ctx) => {
    return input
  })

  onSocketExists(socketFile)
    .then(async () => {
      for (let i = 0; i < 10; i++) {
        const r = await request(defaultRequest(socketFile), 'r' + i)
        t.equals(r.resp.statusCode, 200)
        t.equals(r.resp.headers['content-type'], 'application/json')
        t.equals(r.body, '"r' + i + '"')
      }
      t.end()
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle raw promise from function', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const cleanup = fdk.handle((input, ctx) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve('result'), 1)
    })
  })

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile))
        .then(r => {
          t.equals(r.resp.statusCode, 200)
          t.equals(r.resp.headers['content-type'], 'application/json')
          t.equals(r.body, '"result"')
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle rejected promise from function', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const cleanup = fdk.handle((input, ctx) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Exception in function')), 1)
    })
  })

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile))
        .then(r => {
          t.equals(r.resp.statusCode, 502)
          t.equals(r.resp.headers['content-type'], 'application/json')
          t.deepEquals(JSON.parse(r.body).message, 'Exception in function, consult logs for details')
          t.deepEquals(JSON.parse(r.body).detail, 'Error: Exception in function')
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle async', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const promiseFunc = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve('async result'), 1)
    })
  }
  const cleanup = fdk.handle(async function (input, ctx) {
    const result = await promiseFunc()
    t.equals(result, 'async result')
    return result
  }
  )

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile))
        .then(r => {
          t.equals(r.resp.statusCode, 200)
          t.equals(r.resp.headers['content-type'], 'application/json')
          t.equals(r.body, '"async result"')
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle streamed file', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const cleanup = fdk.handle(async function (input, ctx) {
    ctx.responseContentType = 'text/plain'
    return fdk.streamResult(fs.createReadStream('test/testfile.txt'))
  }
  )

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile))
        .then(r => {
          t.equals(r.resp.statusCode, 200)
          t.equals(r.resp.headers['content-type'], 'text/plain')
          t.equals(r.body, 'Lorum ipsum dolor est')
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

test('handle binary input', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))
  const binaryData = Buffer.from('450002c5939900002c06ef98adc24f6c850186d1', 'hex')

  const cleanup = fdk.handle(async function (input, ctx) {
    ctx.responseContentType = 'application/octet-binary'
    t.equals(input.equals(binaryData), true)
    return fdk.rawResult(binaryData)
  }
  , { inputMode: 'buffer' })

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile), binaryData)
        .then(r => {
          t.equals(r.resp.statusCode, 200)
          t.equals(r.resp.headers['content-type'], 'application/octet-binary')
          t.equals(r.buffer.equals(binaryData), true)
          t.end()
        })
    }).catch(e => t.fail(e))
    .then(cleanup)
    .then(() => socketFile.removeCallback)
})

function defaultSetup (socketFile) {
  return {
    process: {
      env: {
        FN_FORMAT: 'http-stream',
        FN_LISTENER: 'unix:' + socketFile,
        FN_MEMORY: '128',
        FN_FN_ID: 'fnId',
        FN_APP_ID: 'appId',
        FN_FN_NAME: 'fnName',
        FN_APP_NAME: 'appName'
      },
      exit: function () {
        throw new Error('got exit')
      }
    }
  }
}

function tracingSetup (socketFile) {
  return {
    process: {
      env: {
        FN_FORMAT: 'http-stream',
        FN_LISTENER: 'unix:' + socketFile,
        FN_MEMORY: '128',
        FN_FN_ID: 'fnId',
        FN_APP_ID: 'appId',
        FN_FN_NAME: 'fnName',
        FN_APP_NAME: 'appName',
        OCI_TRACING_ENABLED: '1',
        OCI_TRACE_COLLECTOR_URL: 'trace-collector-url'
      },
      exit: function () {
        throw new Error('got exit')
      }
    }
  }
}

/**
 * returns a body which contains {resp: http.resp,body: string,buffer: Buffer}
 */
function request (options, body) {
  return new Promise((resolve, reject) => {
    const callback = res => {
      const body = []
      res.on('data', data => {
        body.push(Buffer.from(data, 'binary'))
      }
      )
      res.on('error', reject)
      res.on('end', () => {
        const allBody = Buffer.concat(body)

        resolve({
          resp: res,
          buffer: allBody,
          body: allBody.toString('utf8')
        })
      })
    }

    const clientRequest = http.request(options, callback)
    if (body != null) {
      clientRequest.write(body)
    }
    clientRequest.end()
  })
}

function defaultDeadline () {
  const deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)
  return deadline
}

function defaultRequest (socketFile) {
  return {
    socketPath: socketFile,
    path: '/call',
    host: 'localhost',
    method: 'POST',
    headers: {
      'Fn-Call-Id': 'callId',
      'Fn-Deadline': defaultDeadline()
    }
  }
}

/**
 * Returns a promise that resolved when a file becomes ready or errorsa after a timeout (default 1 s)
 * @returns {Promise}  a  that is resolved once the file exists
 */
function onSocketExists (file) {
  const timeout = Date.now() + 1000
  return new Promise((resolve, reject) => {
    const interval = 100

    function handleInterval () {
      fs.access(file, (err) => {
        if (err) {
          if (timeout <= Date.now()) {
            const error = new Error('path check timed out')
            error.name = 'PATH_CHECK_TIMED_OUT'
            reject(error)
          } else {
            setTimeout(handleInterval, interval)
          }
        } else {
          resolve(file)
        }
      })
    }

    setTimeout(handleInterval, interval)
  })
}

test('Handle Http input', function (t) {
  const fdk = rewire('../fn-fdk.js')
  const tmpDir = tmp.dirSync({})
  const socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  const deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  const cleanup = fdk.handle((input, ctx) => {
    const z = ctx.httpGateway

    t.equals('DELETE', z.method)
    t.deepEquals({ Fooheader: ['bar', 'baz'], 'Bar-Header': ['bob'] }, z.headers)
    t.equals('/my/url/bar?baz=bob', z.requestURL)

    z.setResponseHeader('My-Out-Header', 'out')
    z.setResponseHeader('otherHeader', 'out2')
    z.addResponseHeader('otherHeader', 'out3')

    z.statusCode = 302

    return 'done'
  })

  onSocketExists(socketFile)
    .then(() => {
      return request({
        socketPath: socketFile,
        path: '/call',
        host: 'localhost',
        method: 'POST',
        headers: {
          'Fn-Call-Id': 'callId',
          'Fn-Deadline': deadline.toString(),
          'My-Header': ['h1', 'h2'],
          'Fn-Intent': 'httprequest',
          'fn-http-method': 'DELETE',
          'Fn-Http-H-FooHeader': ['bar', 'baz'],
          'Fn-Http-H-Bar-Header': 'bob',
          'Fn-Http-Request-Url': '/my/url/bar?baz=bob'
        }
      }).then(r => {
        t.equals(r.body, '"done"')
        t.equals(r.resp.headers['fn-http-h-my-out-header'], 'out')
        t.deepEquals(r.resp.headers['fn-http-h-otherheader'], 'out2, out3')
        t.equals(r.resp.headers['fn-http-status'], '302')
        t.end()
      })
    })
    .then(cleanup)
    .then(() => socketFile.removeCallback)
    .catch(e => t.fail(e))
})
