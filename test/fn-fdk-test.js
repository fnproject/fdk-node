'use strict'
const http = require('http')
const tmp = require('tmp')
const test = require('tape')
const path = require('path')
const fs = require('fs')
const rewire = require('rewire')
/**
 *  Handler Dispatch tests
 */

test('reject missing format env ', function (t) {
  let fdk = rewire('../fn-fdk.js')
  fdk.__set__(
    {
      process: {
        env: {
          FN_LISTENER: 'unix:/tmp/foo.sock',
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
          FN_FORMAT: 'http-stream',
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
          FN_FORMAT: '',
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

/**
 * returns a body which contains {resp: http.resp,body: string}
 */
function request (options, body) {
  return new Promise((resolve, reject) => {
    const callback = res => {
      res.setEncoding('utf8')
      let body = ''
      res.on('data', data => {
          body = body + data.toString()
        }
      )
      res.on('error', reject)
      res.on('end', () => {
        console.log(body)
        resolve({
          resp: res,
          body: body,
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

function defaultSetup (socketFile) {

  return {
    returnShutdown: true,
    process: {
      env: {
        FN_FORMAT: 'http-stream',
        FN_LISTENER: 'unix:' + socketFile,
        FN_MEMORY: '128',
        FN_FN_ID: 'fnId',
        FN_APP_ID: 'appId',
      },
      exit: function () {
        throw new Error('got exit')
      }
    }
  }
}

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
          'My-Header': ['h1', 'h2'],
        }
      }).then(r => {
        t.equals(r.body, 'done')
        t.equals(r.resp.headers['my-out-header'], 'out')
        t.end()
      })
    }).catch(e => t.fail(e))
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
})

function defaultDeadline () {
  let deadline = new Date()
  deadline.setTime(deadline.getTime() + 10000)
  return deadline
}

let defaultRequest = function (socketFile) {
  return {
    socketPath: socketFile,
    path: '/call',
    host: 'localhost',
    method: 'POST',
    headers: {
      'Fn-Call-Id': 'callId',
      'Fn-Deadline': defaultDeadline(),
    }
  }
}
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
          t.deepEquals(JSON.parse(r.body).message, 'Exception in function--consult logs for details')
          t.end()
        })
    }).catch(e => t.fail(e))
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
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
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
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
          t.deepEquals(JSON.parse(r.body).message, 'Exception in function--consult logs for details')
          t.deepEquals(JSON.parse(r.body).detail, 'Error: Exception in function')
          t.end()
        })
    }).catch(e => t.fail(e))
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
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
      let result = await  promiseFunc()
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
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
})

test('handle binary content', function (t) {
  let fdk = rewire('../fn-fdk.js')
  let tmpDir = tmp.dirSync({})
  let socketFile = path.join(tmpDir.name, 'test.sock')
  fdk.__set__(defaultSetup(socketFile))
  let binaryData = Buffer.from('450002c5939900002c06ef98adc24f6c850186d1', 'hex')

  let cleanup = fdk.handle(async function (input, ctx) {
      ctx.responseContentType = 'application/octet-binary'
      t.equals(input.equals(binaryData),true)
      return binaryData
    }
    ,{inputMode:'buffer'})

  onSocketExists(socketFile)
    .then(() => {
      return request(defaultRequest(socketFile),binaryData)
        .then(r => {
          t.equals(r.resp.statusCode, 200)
          t.equals(r.resp.headers['content-type'], 'application/octet-binary')
          t.equals(r.body, binaryData.toString())
          t.end()
        })
    }).catch(e => t.fail(e))
    .finally(cleanup)
    .finally(() => socketFile.removeCallback)
})
// test('default function invocation with context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const inputMessage = 'testbody'
//
//   const callId = '_call_id_'
//   fdk.__set__(
//     {
//       process: {
//         env: {
//           FN_CALL_ID: callId
//         },
//         stdin: new MockStdin(inputMessage),
//         stdout: new MockStdOutput(function () {
//         }),
//         stderr: new MockStdOutput(function () {
//         }),
//         exit: function (code) {
//           t.equals(code, 0)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     // function delares both body and optional context
//     t.equal(body, inputMessage, 'fn function invoked with body')
//     t.equal(ctx.callID, callId, 'fn function invoked with context')
//     return ''
//   })
// })
//
// test('default function invocation no context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const inputMessage = 'testbody'
//
//   fdk.__set__(
//     {
//       process: {
//         env: {},
//         stdin: new MockStdin(inputMessage),
//         stdout: new MockStdOutput(function () {
//         }),
//         stderr: new MockStdOutput(function () {
//         }),
//         exit: function (code) {
//           t.equals(code, 0)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body) {
//     // function does not declare context param
//     t.assert(body, 'fn function invoked with body')
//     return ''
//   })
// })
//
// test('default function string from stdin', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const inputMessage = 'testbody'
//
//   fdk.__set__(
//     {
//       process: {
//         env: {},
//         stdin: new MockStdin(inputMessage),
//         stdout: new MockStdOutput(function () {
//         }),
//         stderr: new MockStdOutput(function (outputMessage) {
//           t.equal(outputMessage, inputMessage)
//         }),
//         exit: function (code) {
//           t.equals(code, 0)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.equal(body, inputMessage)
//     return body
//   })
// })
//
// test('default function json body from stdin', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const inputMessageJSON = {'testMessage': 'message'}
//   const inputMessage = JSON.stringify(inputMessageJSON)
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_HEADER_CONTENT_TYPE': 'application/json'},
//         stdin: new MockStdin(inputMessage),
//         stdout: new MockStdOutput(function () {
//         }),
//         stderr: new MockStdOutput(function (outputMessage) {
//           t.equal(outputMessage, inputMessage)
//         }),
//         exit: function (code) {
//           t.equals(code, 0)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.deepEqual(body, inputMessageJSON)
//     return body
//   })
// })
//
// /*
//  *  JSON format tests
//  */
//
// test('build JSON context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//
//   const appName = 'test'
//   const fnmemory = '128'
//   const fnpath = '/testfn'
//   const fntype = 'sync'
//   const env = {
//     'CONFIG_VAR': 'config-val',
//     'FN_PATH': fnpath,
//     'FN_FORMAT': 'json',
//     'FN_APP_NAME': appName,
//     'FN_MEMORY': fnmemory,
//     'FN_TYPE': fntype
//   }
//
//   const contentType = 'application/json'
//   const method = 'POST'
//   const requestUrl = 'http://localhost:8080/r/myapp/hello'
//   const callId = '01C4EQBEEF47WGA00000000000'
//   const deadline = '2018-01-17T22:26:49.387Z'
//   const myheaderval = 'myheadervalue'
//   const request = {
//     'call_id': callId,
//     'content_type': contentType,
//     'type': fntype,
//     'deadline': deadline,
//     'protocol': {
//       'type': 'http',
//       'method': method,
//       'request_url': requestUrl,
//       'headers': {
//         'Fn-foo': ['bar'],
//         'Content-Type': [contentType],
//         'MY_HEADER': [myheaderval]
//       }
//     }
//   }
//
//   const JSONContext = fdk.__get__('JSONContext')
//   let ctx = new JSONContext(env, request)
//
//   t.equal(ctx.getConfig('CONFIG_VAR'), 'config-val')
//   t.equal(ctx.appName, appName, 'appName')
//   t.equal(ctx.callID, callId, 'callID')
//   t.equal(ctx.deadline, deadline, 'deadline')
//   t.equal(ctx.format, 'json', 'format')
//   t.equal(ctx.memory, parseInt(fnmemory), 'memory')
//   t.equal(ctx.path, fnpath, 'path')
//   t.equal(ctx.type, fntype, 'type')
//   t.equal(ctx.contentType, request.content_type, 'content_type')
//   t.equal(ctx.protocol.requestUrl, requestUrl, 'requestUrl')
//   t.equal(ctx.protocol.method, method, 'method')
//   t.deepEqual(ctx.protocol.headers, {
//     'Content-Type': [contentType],
//     'My-Header': [myheaderval],
//     'Fn-Foo': ['bar']
//   }, 'headers')
//
//   t.end()
// })
//
// test('JSON function invocation with context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//
//   const payload = {msg: 'Jane'}
//   const callId = '01C433NT3V47WGA00000000000'
//   const request = {
//     'body': JSON.stringify(payload),
//     'content_type': 'application/json',
//     'call_id': callId,
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function () {
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.deepEqual(body, payload)
//     t.equal(ctx.callID, callId, 'callID context value')
//     t.equal(ctx.contentType, 'application/json', 'content_type')
//     t.end()
//     return ''
//   })
// })
//
// test('JSON function invocation with non-JSON input', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const payload = 'Jane'
//   const callId = '01C433NT3V47WGA00000000000'
//   const request = {
//     'body': payload,
//     'content_type': 'text/plain',
//     'call_id': callId,
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.equal(body, payload)
//     t.equal(ctx.callID, callId, 'call_id context value')
//     t.end()
//     return ''
//   })
// })
//
// test('JSON function invocation with non-JSON output', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const request = {
//     'body': JSON.stringify('Jane'),
//     'content_type': 'application/json',
//     'call_id': '01C433NT3V47WGA00000000000',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   const expectedResponse = 'Hello Folks'
//   const responseContentType = 'text/plain'
//   const expectedResponseBody = buildJSONResponse(expectedResponse, responseContentType)
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           t.deepEqual(JSON.parse(chunk), expectedResponseBody)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     ctx.responseContentType = 'text/plain'
//     return expectedResponse
//   })
// })
//
// test('JSON function invocation no context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const payload = 'Jane'
//   const request = {
//     'body': JSON.stringify(payload),
//     'content_type': 'application/json',
//     'call_id': '_call_id_',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {}
//     }
//   }
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function () {
//         })
//       }
//     })
//
//   fdk.handle(function (body) {
//     // function does not declare context param
//     t.equal(body, payload, 'fn function invoked with body')
//     t.end()
//     return ''
//   })
// })
//
// test('JSON function body and response', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const payload = 'Jane'
//
//   const inputBody = JSON.stringify(payload)
//   const callId = '1'
//   const contentType = 'application/json'
//   const request = {
//     'body': inputBody,
//     'content_type': contentType,
//     'call_id': callId,
//     'protocol': {
//       'headers': {
//         'Content-Type': [contentType]
//       }
//     }
//   }
//   const expectedOutputPayload = payload + callId
//   const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedOutputPayload)
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function (data) {
//           process.stderr.write(data)
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           let response = JSON.parse(chunk)
//           t.deepEqual(response, expectedJSONResponse)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.equal(body, payload) // parsed JSON
//     return body + ctx.callID
//   })
// })
//
// test('JSON format function exception', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//
//   const request = {
//     'body': JSON.stringify(''),
//     'content_type': 'application/json',
//     'protocol': {
//       'headers': {
//         'Fn_call_id': ['1']
//       }
//     }
//   }
//   // FDK error message constant
//   const expectedBody = fdk.__get__('fnFunctionExceptionMessage')
//   const expectedOutputContentType = 'text/plain'
//   const expectedJSONResponse = buildJSONErrorResponse(expectedBody, expectedOutputContentType)
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           let response = JSON.parse(chunk)
//           t.deepEqual(expectedJSONResponse, response)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     throw new Error('intentional error')
//   })
// })
//
// test('JSON Write to stdout does not pollute protocol', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const request = {
//     'body': JSON.stringify('Jane'),
//     'content_type': 'application/json',
//     'call_id': '01C433NT3V47WGA00000000000',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   const expectedBody = 'Result'
//   const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedBody)
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           var response = JSON.parse(chunk)
//           t.deepEqual(expectedJSONResponse, response)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     process.stdout.write('Hello World')
//     return expectedBody
//   })
// })
//
// test('JSON function handles multiple events', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const request1 = {
//     'body': JSON.stringify(0),
//     'content_type': 'application/json',
//     'call_id': '1',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//   const request2 = {
//     'body': JSON.stringify(1),
//     'content_type': 'application/json',
//     'call_id': '1',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   let respCount = 0
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request1) + '\n' + JSON.stringify(request2)),
//         stdout: new MockStdOutput(function (chunk) {
//           let response = JSON.parse(chunk)
//           t.deepEqual(response, buildJSONResponseWithJSONBody(respCount))
//           respCount++
//           if (respCount === 1) {
//             t.end()
//           }
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     return body
//   })
// })
//
// test('JSON function Handles valid promise', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const request = {
//     'body': JSON.stringify(''),
//     'content_type': 'application/json',
//     'call_id': '01C433NT3V47WGA00000000000',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   const expectedBody = 'Result'
//   const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedBody)
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           let response = JSON.parse(chunk)
//           t.deepEqual(response, expectedJSONResponse)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     return new Promise(function (resolve, reject) {
//       setTimeout(() => resolve(expectedBody), 10)
//     })
//   })
// })
//
// test('JSON function Handles rejected promise ', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const request = {
//     'body': JSON.stringify(''),
//     'content_type': 'application/json',
//     'call_id': '01C433NT3V47WGA00000000000',
//     'protocol': {
//       'request_url': 'http://a.proto/r/path',
//       'headers': {
//         'Content-Type': ['application/json']
//       }
//     }
//   }
//
//   const expectedJSONResponse = buildJSONErrorResponse(fdk.__get__('fnFunctionExceptionMessage'),
//     'text/plain')
//
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'json'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(JSON.stringify(request)),
//         stdout: new MockStdOutput(function (chunk) {
//           let response = JSON.parse(chunk)
//           t.deepEqual(response, expectedJSONResponse)
//           t.end()
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     return new Promise(function (resolve, reject) {
//       setTimeout(() => reject(new Error('intentional error')), 10)
//     })
//   })
// })
//
// test('Default function Handles valid promise', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//   const envVars = {
//     'FN_FORMAT': 'default'
//   }
//   const expectedBody = 'Result'
//   fdk.__set__(
//     {
//       process: {
//         env: envVars,
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(''),
//         stdout: new MockStdOutput(function (chunk) {
//           t.equal(chunk, expectedBody)
//         }),
//         exit: function (code) {
//           t.equal(code, 0)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     console.log('called default fn')
//
//     return new Promise(function (resolve, reject) {
//       setTimeout(() => resolve(expectedBody), 10)
//     })
//   })
// })
//
// test('Default function Handles rejected promise ', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//
//   const expectedBody = fdk.__get__('fnFunctionExceptionMessage')
//   fdk.__set__(
//     {
//       process: {
//         env: {'FN_FORMAT': 'default'},
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(''),
//         stdout: new MockStdOutput(function (chunk) {
//           t.equal(chunk, expectedBody)
//         }),
//         exit: function (code) {
//           t.equal(code, 1)
//           t.end()
//         }
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     return new Promise(function (resolve, reject) {
//       setTimeout(() => reject(new Error('intentional error')), 10)
//     })
//   })
// })
//
// function sendUDSRequest (options, timeout, callback) {
//   const clientRequest = http.request(options, callback)
//   clientRequest.end()
// }
//
// test('http-stream function invocation with context', function (t) {
//   let fdk = rewire('../fn-fdk.js')
//
//   let tmpDir = tmp.dirSync()
//   let tmpDirName = tmpDir.name
//
//   let socketFile = tmpDirName + '/fn.sock'
//
//   const payload = {msg: 'Jane'}
//   const callId = '01C433NT3V47WGA00000000000'
//
//   fdk.__set__(
//     {
//       process: {
//         env: {
//           'FN_FORMAT': 'http-stream',
//           'FN_LISTENER': 'unix:' + socketFile
//         },
//         stderr: new MockStdOutput(function () {
//         }),
//         stdin: new MockStdin(function () {
//         }),
//         stdout: new MockStdOutput(function () {
//         })
//       }
//     })
//
//   fdk.handle(function (body, ctx) {
//     t.deepEqual(body, payload)
//     t.equal(ctx.callID, callId, 'callID context value')
//     t.equal(ctx.contentType, 'application/json', 'content_type')
//     return 'OK'
//   })
//
//   const options = {
//     socketPath: socketFile,
//     method: 'POST',
//     path: '/call'
//   }
//
//   const callback = res => {
//     console.log(`STATUS: ${res.statusCode}`)
//     res.setEncoding('utf8')
//     res.on('data', data => console.log(data))
//     res.on('error', data => console.error(data))
//   }
// })
//
// // /**
// //  * Redirect standard io
// //  */
// // test('Redirect stdout and prefix', function(t) {
// //   t.plan(1);
// //   var fdk = rewire('../fn-fdk.js')
// //     , body = "Tom";
//
// //   fdk.__set__({
// //     fs: new MockFs(t, '/dev/stdin', body),
// //     process: {
// //       env: {},
// //       stdin:  new MockStdin(function() {
// //         t.fail('stdin read');  // TODO: should stdin access throw exception?
// //       }),
// //       stdout: new MockStdOutput(function() {
// //         t.fail('output on stdout');
// //       }),
// //       stderr: new MockStdOutput(function (line) {
// //         t.equal('[out] ' + body);
// //       })
// //     }
// //   });
//
// //   fdk.handle(function(body, ctx) {
// //     process.stdout.write(body);
// //   });
// //   t.end();
// // });
//
// // test('Redirect stderr and prefix', function(t) {
// //   t.plan(1);
// //   var fdk = rewire('../fn-fdk.js')
// //     , body = "Tom";
//
// //   fdk.__set__({
// //     fs: new MockFs(t, '/dev/stdin', body),
// //     process: {
// //       env: {},
// //       stdin:  new MockStdin(function() {
// //         t.fail('stdin read'); // TODO: should stdin access throw exception?
// //       }),
// //       stdout: new MockStdOutput(function() {
// //         t.fail('output on stdout');
// //       }),
// //       stderr: new MockStdOutput(function (line) {
// //         t.equal('[err] ' + body);
// //       })
// //     }
// //   });
//
// //   fdk.handle(function(body, ctx) {
// //     process.stderr.write(body);
// //   });
// //   t.end();
// // });
//
// /**
//  * Utilities
//  */
//
// function buildJSONResponse (payload, contentType) {
//   return {
//     body: payload,
//     content_type: contentType,
//     protocol: {
//       status_code: 200,
//       headers: {}
//     }
//
//     test('default non-FN env var', function (t) {
//       let fdk = rewire('../fn-fdk.js')
//
//       const envKey = 'ABCDE'
//       const envValue = '12345'
//
//       let envVars = {}
//       envVars[envKey] = envValue
//
//       fdk.__set__(
//         {
//           process: {
//             env: envVars,
//             stdin: new MockStdin(''),
//             stdout: new MockStdOutput(function () {
//             }),
//             stderr: new MockStdOutput(function () {
//             }),
//             exit: function (code) {
//               t.equals(code, 0)
//               t.end()
//             }
//           }
//         })
//
//       fdk.handle(function (body, ctx) {
//         t.equal(body, '', 'body should be empty string')
//         t.equal(ctx.getConfig(envKey), envValue, envKey + ' env var value')
//         return ''
//       })
//     })
//
//   test('default function invocation with context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const inputMessage = 'testbody'
//
//     const callId = '_call_id_'
//     fdk.__set__(
//       {
//         process: {
//           env: {
//             FN_CALL_ID: callId
//           },
//           stdin: new MockStdin(inputMessage),
//           stdout: new MockStdOutput(function () {
//           }),
//           stderr: new MockStdOutput(function () {
//           }),
//           exit: function (code) {
//             t.equals(code, 0)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       // function delares both body and optional context
//       t.equal(body, inputMessage, 'fn function invoked with body')
//       t.equal(ctx.callID, callId, 'fn function invoked with context')
//       return ''
//     })
//   })
//
//   test('default function invocation no context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const inputMessage = 'testbody'
//
//     fdk.__set__(
//       {
//         process: {
//           env: {},
//           stdin: new MockStdin(inputMessage),
//           stdout: new MockStdOutput(function () {
//           }),
//           stderr: new MockStdOutput(function () {
//           }),
//           exit: function (code) {
//             t.equals(code, 0)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body) {
//       // function does not declare context param
//       t.assert(body, 'fn function invoked with body')
//       return ''
//     })
//   })
//
//   test('default function string from stdin', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const inputMessage = 'testbody'
//
//     fdk.__set__(
//       {
//         process: {
//           env: {},
//           stdin: new MockStdin(inputMessage),
//           stdout: new MockStdOutput(function () {
//           }),
//           stderr: new MockStdOutput(function (outputMessage) {
//             t.equal(outputMessage, inputMessage)
//           }),
//           exit: function (code) {
//             t.equals(code, 0)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.equal(body, inputMessage)
//       return body
//     })
//   })
//
//   test('default function json body from stdin', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const inputMessageJSON = {'testMessage': 'message'}
//     const inputMessage = JSON.stringify(inputMessageJSON)
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_HEADER_CONTENT_TYPE': 'application/json'},
//           stdin: new MockStdin(inputMessage),
//           stdout: new MockStdOutput(function () {
//           }),
//           stderr: new MockStdOutput(function (outputMessage) {
//             t.equal(outputMessage, inputMessage)
//           }),
//           exit: function (code) {
//             t.equals(code, 0)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.deepEqual(body, inputMessageJSON)
//       return body
//     })
//   })
//
//   /*
//    *  JSON format tests
//    */
//
//   test('build JSON context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//
//     const appName = 'test'
//     const fnmemory = '128'
//     const fnpath = '/testfn'
//     const fntype = 'sync'
//     const env = {
//       'CONFIG_VAR': 'config-val',
//       'FN_PATH': fnpath,
//       'FN_FORMAT': 'json',
//       'FN_APP_NAME': appName,
//       'FN_MEMORY': fnmemory,
//       'FN_TYPE': fntype
//     }
//
//     const contentType = 'application/json'
//     const method = 'POST'
//     const requestUrl = 'http://localhost:8080/r/myapp/hello'
//     const callId = '01C4EQBEEF47WGA00000000000'
//     const deadline = '2018-01-17T22:26:49.387Z'
//     const myheaderval = 'myheadervalue'
//     const request = {
//       'call_id': callId,
//       'content_type': contentType,
//       'type': fntype,
//       'deadline': deadline,
//       'protocol': {
//         'type': 'http',
//         'method': method,
//         'request_url': requestUrl,
//         'headers': {
//           'Fn-foo': ['bar'],
//           'Content-Type': [contentType],
//           'MY_HEADER': [myheaderval]
//         }
//       }
//     }
//
//     const JSONContext = fdk.__get__('JSONContext')
//     let ctx = new JSONContext(env, request)
//
//     t.equal(ctx.getConfig('CONFIG_VAR'), 'config-val')
//     t.equal(ctx.appName, appName, 'appName')
//     t.equal(ctx.callID, callId, 'callID')
//     t.equal(ctx.deadline, deadline, 'deadline')
//     t.equal(ctx.format, 'json', 'format')
//     t.equal(ctx.memory, parseInt(fnmemory), 'memory')
//     t.equal(ctx.path, fnpath, 'path')
//     t.equal(ctx.type, fntype, 'type')
//     t.equal(ctx.contentType, request.content_type, 'content_type')
//     t.equal(ctx.protocol.requestUrl, requestUrl, 'requestUrl')
//     t.equal(ctx.protocol.method, method, 'method')
//     t.deepEqual(ctx.protocol.headers, {
//       'Content-Type': [contentType],
//       'My-Header': [myheaderval],
//       'Fn-Foo': ['bar']
//     }, 'headers')
//
//     t.end()
//   })
//
//   test('JSON function invocation with context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//
//     const payload = {msg: 'Jane'}
//     const callId = '01C433NT3V47WGA00000000000'
//     const request = {
//       'body': JSON.stringify(payload),
//       'content_type': 'application/json',
//       'call_id': callId,
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function () {
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.deepEqual(body, payload)
//       t.equal(ctx.callID, callId, 'callID context value')
//       t.equal(ctx.contentType, 'application/json', 'content_type')
//       t.end()
//       return ''
//     })
//   })
//
//   test('JSON function invocation with non-JSON input', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const payload = 'Jane'
//     const callId = '01C433NT3V47WGA00000000000'
//     const request = {
//       'body': payload,
//       'content_type': 'text/plain',
//       'call_id': callId,
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.equal(body, payload)
//       t.equal(ctx.callID, callId, 'call_id context value')
//       t.end()
//       return ''
//     })
//   })
//
//   test('JSON function invocation with non-JSON output', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const request = {
//       'body': JSON.stringify('Jane'),
//       'content_type': 'application/json',
//       'call_id': '01C433NT3V47WGA00000000000',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     const expectedResponse = 'Hello Folks'
//     const responseContentType = 'text/plain'
//     const expectedResponseBody = buildJSONResponse(expectedResponse, responseContentType)
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             t.deepEqual(JSON.parse(chunk), expectedResponseBody)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       ctx.responseContentType = 'text/plain'
//       return expectedResponse
//     })
//   })
//
//   test('JSON function invocation no context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const payload = 'Jane'
//     const request = {
//       'body': JSON.stringify(payload),
//       'content_type': 'application/json',
//       'call_id': '_call_id_',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {}
//       }
//     }
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function () {
//           })
//         }
//       })
//
//     fdk.handle(function (body) {
//       // function does not declare context param
//       t.equal(body, payload, 'fn function invoked with body')
//       t.end()
//       return ''
//     })
//   })
//
//   test('JSON function body and response', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const payload = 'Jane'
//
//     const inputBody = JSON.stringify(payload)
//     const callId = '1'
//     const contentType = 'application/json'
//     const request = {
//       'body': inputBody,
//       'content_type': contentType,
//       'call_id': callId,
//       'protocol': {
//         'headers': {
//           'Content-Type': [contentType]
//         }
//       }
//     }
//     const expectedOutputPayload = payload + callId
//     const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedOutputPayload)
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function (data) {
//             process.stderr.write(data)
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             let response = JSON.parse(chunk)
//             t.deepEqual(response, expectedJSONResponse)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.equal(body, payload) // parsed JSON
//       return body + ctx.callID
//     })
//   })
//
//   test('JSON format function exception', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//
//     const request = {
//       'body': JSON.stringify(''),
//       'content_type': 'application/json',
//       'protocol': {
//         'headers': {
//           'Fn_call_id': ['1']
//         }
//       }
//     }
//     // FDK error message constant
//     const expectedBody = fdk.__get__('fnFunctionExceptionMessage')
//     const expectedOutputContentType = 'text/plain'
//     const expectedJSONResponse = buildJSONErrorResponse(expectedBody, expectedOutputContentType)
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             let response = JSON.parse(chunk)
//             t.deepEqual(expectedJSONResponse, response)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       throw new Error('intentional error')
//     })
//   })
//
//   test('JSON Write to stdout does not pollute protocol', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const request = {
//       'body': JSON.stringify('Jane'),
//       'content_type': 'application/json',
//       'call_id': '01C433NT3V47WGA00000000000',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     const expectedBody = 'Result'
//     const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedBody)
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             var response = JSON.parse(chunk)
//             t.deepEqual(expectedJSONResponse, response)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       process.stdout.write('Hello World')
//       return expectedBody
//     })
//   })
//
//   test('JSON function handles multiple events', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const request1 = {
//       'body': JSON.stringify(0),
//       'content_type': 'application/json',
//       'call_id': '1',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//     const request2 = {
//       'body': JSON.stringify(1),
//       'content_type': 'application/json',
//       'call_id': '1',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     let respCount = 0
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request1) + '\n' + JSON.stringify(request2)),
//           stdout: new MockStdOutput(function (chunk) {
//             let response = JSON.parse(chunk)
//             t.deepEqual(response, buildJSONResponseWithJSONBody(respCount))
//             respCount++
//             if (respCount === 1) {
//               t.end()
//             }
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       return body
//     })
//   })
//
//   test('JSON function Handles valid promise', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const request = {
//       'body': JSON.stringify(''),
//       'content_type': 'application/json',
//       'call_id': '01C433NT3V47WGA00000000000',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     const expectedBody = 'Result'
//     const expectedJSONResponse = buildJSONResponseWithJSONBody(expectedBody)
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             let response = JSON.parse(chunk)
//             t.deepEqual(response, expectedJSONResponse)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       return new Promise(function (resolve, reject) {
//         setTimeout(() => resolve(expectedBody), 10)
//       })
//     })
//   })
//
//   test('JSON function Handles rejected promise ', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const request = {
//       'body': JSON.stringify(''),
//       'content_type': 'application/json',
//       'call_id': '01C433NT3V47WGA00000000000',
//       'protocol': {
//         'request_url': 'http://a.proto/r/path',
//         'headers': {
//           'Content-Type': ['application/json']
//         }
//       }
//     }
//
//     const expectedJSONResponse = buildJSONErrorResponse(fdk.__get__('fnFunctionExceptionMessage'),
//       'text/plain')
//
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'json'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(JSON.stringify(request)),
//           stdout: new MockStdOutput(function (chunk) {
//             let response = JSON.parse(chunk)
//             t.deepEqual(response, expectedJSONResponse)
//             t.end()
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       return new Promise(function (resolve, reject) {
//         setTimeout(() => reject(new Error('intentional error')), 10)
//       })
//     })
//   })
//
//   test('Default function Handles valid promise', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//     const envVars = {
//       'FN_FORMAT': 'default'
//     }
//     const expectedBody = 'Result'
//     fdk.__set__(
//       {
//         process: {
//           env: envVars,
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(''),
//           stdout: new MockStdOutput(function (chunk) {
//             t.equal(chunk, expectedBody)
//           }),
//           exit: function (code) {
//             t.equal(code, 0)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       console.log('called default fn')
//
//       return new Promise(function (resolve, reject) {
//         setTimeout(() => resolve(expectedBody), 10)
//       })
//     })
//   })
//
//   test('Default function Handles rejected promise ', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//
//     const expectedBody = fdk.__get__('fnFunctionExceptionMessage')
//     fdk.__set__(
//       {
//         process: {
//           env: {'FN_FORMAT': 'default'},
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(''),
//           stdout: new MockStdOutput(function (chunk) {
//             t.equal(chunk, expectedBody)
//           }),
//           exit: function (code) {
//             t.equal(code, 1)
//             t.end()
//           }
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       return new Promise(function (resolve, reject) {
//         setTimeout(() => reject(new Error('intentional error')), 10)
//       })
//     })
//   })
//
//   function sendUDSRequest (options, timeout, callback) {
//     const clientRequest = http.request(options, callback)
//     clientRequest.end()
//   }
//
//   test('http-stream function invocation with context', function (t) {
//     let fdk = rewire('../fn-fdk.js')
//
//     let tmpDir = tmp.dirSync()
//     let tmpDirName = tmpDir.name
//
//     let socketFile = tmpDirName + '/fn.sock'
//
//     const payload = {msg: 'Jane'}
//     const callId = '01C433NT3V47WGA00000000000'
//
//     fdk.__set__(
//       {
//         process: {
//           env: {
//             'FN_FORMAT': 'http-stream',
//             'FN_LISTENER': 'unix:' + socketFile
//           },
//           stderr: new MockStdOutput(function () {
//           }),
//           stdin: new MockStdin(function () {
//           }),
//           stdout: new MockStdOutput(function () {
//           })
//         }
//       })
//
//     fdk.handle(function (body, ctx) {
//       t.deepEqual(body, payload)
//       t.equal(ctx.callID, callId, 'callID context value')
//       t.equal(ctx.contentType, 'application/json', 'content_type')
//       return 'OK'
//     })
//
//     const options = {
//       socketPath: socketFile,
//       method: 'POST',
//       path: '/call'
//     }
//
//     const callback = res => {
//       console.log(`STATUS: ${res.statusCode}`)
//       res.setEncoding('utf8')
//       res.on('data', data => console.log(data))
//       res.on('error', data => console.error(data))
//     }
//   })
//
// // /**
// //  * Redirect standard io
// //  */
// // test('Redirect stdout and prefix', function(t) {
// //   t.plan(1);
// //   var fdk = rewire('../fn-fdk.js')
// //     , body = "Tom";
//
// //   fdk.__set__({
// //     fs: new MockFs(t, '/dev/stdin', body),
// //     process: {
// //       env: {},
// //       stdin:  new MockStdin(function() {
// //         t.fail('stdin read');  // TODO: should stdin access throw exception?
// //       }),
// //       stdout: new MockStdOutput(function() {
// //         t.fail('output on stdout');
// //       }),
// //       stderr: new MockStdOutput(function (line) {
// //         t.equal('[out] ' + body);
// //       })
// //     }
// //   });
//
// //   fdk.handle(function(body, ctx) {
// //     process.stdout.write(body);
// //   });
// //   t.end();
// // });
//
// // test('Redirect stderr and prefix', function(t) {
// //   t.plan(1);
// //   var fdk = rewire('../fn-fdk.js')
// //     , body = "Tom";
//
// //   fdk.__set__({
// //     fs: new MockFs(t, '/dev/stdin', body),
// //     process: {
// //       env: {},
// //       stdin:  new MockStdin(function() {
// //         t.fail('stdin read'); // TODO: should stdin access throw exception?
// //       }),
// //       stdout: new MockStdOutput(function() {
// //         t.fail('output on stdout');
// //       }),
// //       stderr: new MockStdOutput(function (line) {
// //         t.equal('[err] ' + body);
// //       })
// //     }
// //   });
//
// //   fdk.handle(function(body, ctx) {
// //     process.stderr.write(body);
// //   });
// //   t.end();
// // });
//
//   /**
//    * Utilities
//    */
//
//   function buildJSONResponse (payload, contentType) {
//     return {
//       body: payload,
//       content_type: contentType,
//       protocol: {
//         status_code: 200,
//         headers: {}
//       }
//     }
//   }
//
//   function buildJSONResponseWithJSONBody (payload) {
//     return buildJSONResponse(JSON.stringify(payload), 'application/json')
//   }
//
//   function buildJSONErrorResponse (errorMessage, contentType) {
//     return {
//       body: errorMessage,
//       content_type: contentType,
//       protocol: {
//         status_code: 500
//       }
//     }
//   }
//   }
// }
//
// function buildJSONResponseWithJSONBody (payload) {
//   return buildJSONResponse(JSON.stringify(payload), 'application/json')
// }
//
// function buildJSONErrorResponse (errorMessage, contentType) {
//   return {
//     body: errorMessage,
//     content_type: contentType,
//     protocol: {
//       status_code: 500
//     }
//   }
// }

/**
 * Returns a promise that resolved when a file becomes ready or errorsa after a timeout (default 1 s)
 * @returns {Promise}  a  that is resolved once the file exists
 */
function onSocketExists (file) {
  let timeout = 1000
  return new Promise((resolve, reject) => {
    const timeoutTimerId = setTimeout(handleTimeout, timeout)
    const interval = timeout / 10
    let intervalTimerId

    function handleTimeout () {
      clearTimeout(timerId)

      const error = new Error('path check timed out')
      error.name = 'PATH_CHECK_TIMED_OUT'
      reject(error)
    }

    function handleInterval () {
      fs.access(file, (err) => {
        if (err) {
          intervalTimerId = setTimeout(handleInterval, interval)
        } else {
          clearTimeout(timeoutTimerId)
          resolve(file)
        }
      })
    }

    intervalTimerId = setTimeout(handleInterval, interval)
  })
}