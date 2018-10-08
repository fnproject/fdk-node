'use strict'
const http = require('http')
const tmp = require('tmp')
const test = require('tape')
const path = require('path')
const fs = require('fs')
const rewire = require('rewire')

test('reject missing format env ', function (t) {
  let fdk = rewire('../fn-fdk.js')
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
  let fdk = rewire('../fn-fdk.js')
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
  let fdk = rewire('../fn-fdk.js')
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  let cleanup = fdk.handle((input, ctx) => {
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

test('handle exception from function', function (t) {
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let cleanup = fdk.handle((input, ctx) => {
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)

  let cleanup = fdk.handle((input, ctx) => {
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let cleanup = fdk.handle((input, ctx) => {
    return input
  })

  onSocketExists(socketFile)
    .then(async () => {
      for (let i = 0; i < 10; i++) {
        let r = await request(defaultRequest(socketFile), 'r' + i)
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let cleanup = fdk.handle((input, ctx) => {
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let cleanup = fdk.handle((input, ctx) => {
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let promiseFunc = () => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve('async result'), 1)
    })
  }
  let cleanup = fdk.handle(async function (input, ctx) {
    let result = await promiseFunc()
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))

  let cleanup = fdk.handle(async function (input, ctx) {
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
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))
  let binaryData = Buffer.from('450002c5939900002c06ef98adc24f6c850186d1', 'hex')

  let cleanup = fdk.handle(async function (input, ctx) {
    ctx.responseContentType = 'application/octet-binary'
    t.equals(input.equals(binaryData), true)
    return fdk.rawResult(binaryData)
  }
    , {inputMode: 'buffer'})

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
        FN_APP_ID: 'appId'
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
      let body = []
      res.on('data', data => {
        body.push(Buffer.from(data, 'binary'))
      }
      )
      res.on('error', reject)
      res.on('end', () => {
        let allBody = Buffer.concat(body)

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
  let deadline = new Date()
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
  let timeout = Date.now() + 1000
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
