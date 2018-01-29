'use strict'

const test = require('tape')
const rewire = require('rewire')
const {MockStdOutput} = require('./mocks.js')
const {MockStdin} = require('./mocks.js')
const {MockFs} = require('./mocks.js')

/**
 *  Handler Dispatch tests
 */

test('default dispatch no format declared', function (t) {
  let fdk = rewire('../fn-fdk.js')

  fdk.__set__(
    {
      process: {
        env: {}
      },
      handleDefault: function (fnfunction) {
        t.pass('default handler called')
        t.end()
      },
      handleJSON: function (fnfunction) {
        t.fail('JSON handler called')
      }
    })

  fdk.handle(null)
})

test('default dispatch with format declared', function (t) {
  let fdk = rewire('../fn-fdk.js')

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'default'}
      },
      handleDefault: function (fnfunction) {
        t.pass('default handler called')
        t.end()
      },
      handleJSON: function (fnfunction) {
        t.fail('JSON handler called')
      }
    })

  fdk.handle(null)
})

test('JSON dispatch with format declared', function (t) {
  let fdk = rewire('../fn-fdk.js')

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'}
      },
      handleDefault: function (fnfunction) {
        t.fail('default handler called')
      },
      handleJSON: function (fnfunction) {
        t.pass('JSON handler called')
        t.end()
      }
    })

  fdk.handle(null)
})

/**
 *  Default format tests
 */

test('build default context', function (t) {
  let fdk = rewire('../fn-fdk.js')

  const fnappname = 'myapp'
  const one = 'one'
  const three = 'three'
  const fntype = 'sync'
  const fncallid = '01C4EQ8HR447WG200000000000'
  const fncontenttype = 'application/json'
  const acceptencodingheader = 'gzip'
  const fnformat = 'default'
  const fnpath = '/testfn'
  const fnmemory = '128'
  const fndeadline = '2018-01-22T10:40:45.108Z'
  const fnmethod = 'GET'
  const useragentheader = 'Go-http-client/1.1'
  const fnrequesturl = 'http://localhost:8080/r/test/testfn'
  const body = 'body'

  const envVars = {
    one: one,
    three: three,
    'FN_TYPE': fntype,
    'FN_CALL_ID': fncallid,
    'FN_HEADER_Content-Type': fncontenttype,
    'FN_HEADER_Accept-Encoding': acceptencodingheader,
    'FN_FORMAT': fnformat,
    'FN_PATH': fnpath,
    'FN_MEMORY': fnmemory,
    'FN_HEADER_Fn_deadline': fndeadline,
    'FN_METHOD': fnmethod,
    'FN_HEADER_User-Agent': useragentheader,
    'FN_REQUEST_URL': fnrequesturl,
    'FN_APP_NAME': fnappname
  }

  const DefaultContext = fdk.__get__('DefaultContext')
  let ctx = new DefaultContext(body, envVars)

  t.equal(ctx.getConfig(one), one, 'config one')
  t.equal(ctx.getConfig(three), three, 'config three')
  t.equal(ctx.appName, fnappname, 'app name')
  t.equal(ctx.callId, fncallid, 'call id')
  t.equal(ctx.contentType, fncontenttype, 'content type')
  t.equal(ctx.path, fnpath, 'path')
  t.equal(ctx.memory, parseInt(fnmemory), 'memory')
  t.equal(ctx.deadline, fndeadline, 'deadline')
  t.equal(ctx.type, fntype, 'type')

  t.deepEqual(ctx.protocol.headers, {
    'Content-Type': [fncontenttype],
    'Accept-Encoding': [acceptencodingheader],
    'User-Agent': [useragentheader]
  }, 'headers')

  t.end()
})

test('default non-FN env var', function (t) {
  let fdk = rewire('../fn-fdk.js')

  const envKey = 'ABCDE'
  const envValue = '12345'

  let envVars = {}
  envVars[envKey] = envValue

  fdk.__set__(
    {
      fs: new MockFs(t, '/dev/stdin', ''),
      process: {
        env: envVars,
        stdin: new MockStdin(function () {
          t.fail('stdin read')
        }),
        stdout: new MockStdOutput(function () {
        }),
        stderr: new MockStdOutput(function () {
        }),
        exit: function (code) {
          t.equals(code, 0)
          t.end()
        }
      }
    })

  fdk.handle(function (body, ctx) {
    t.equal(ctx.getConfig(envKey), envValue, envKey + ' env var value')
    return ''
  })
})

test('default function invocation with context', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const inputMessage = 'testbody'

  fdk.__set__(
    {
      fs: new MockFs(t, '/dev/stdin', inputMessage),
      process: {
        env: {},
        stdin: new MockStdin(function () {
          t.fail('stdin read')
        }),
        stdout: new MockStdOutput(function () {
        }),
        stderr: new MockStdOutput(function () {
        }),
        exit: function (code) {
          t.equals(code, 0)
          t.end()
        }
      }
    })

  fdk.handle(function (body, ctx) {
    // function delares both body and optional context
    t.assert(body, 'fn function invoked with body')
    t.assert(ctx, 'fn function invoked with context')
    return ''
  })
})

test('default function invocation no context', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const inputMessage = 'testbody'

  fdk.__set__(
    {
      fs: new MockFs(t, '/dev/stdin', inputMessage),
      process: {
        env: {},
        stdin: new MockStdin(function () {
          t.fail('stdin read')
        }),
        stdout: new MockStdOutput(function () {
        }),
        stderr: new MockStdOutput(function () {
        }),
        exit: function (code) {
          t.equals(code, 0)
          t.end()
        }
      }
    })

  fdk.handle(function (body) {
    // function does not declare context param
    t.assert(body, 'fn function invoked with body')
    return ''
  })
})

test('default function string from stdin', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const inputMessage = 'testbody'

  fdk.__set__(
    {
      fs: new MockFs(t, '/dev/stdin', inputMessage),
      process: {
        env: {},
        stdin: new MockStdin(function () {
          t.fail('stdin read')
        }),
        stdout: new MockStdOutput(function () {
        }),
        stderr: new MockStdOutput(function (outputMessage) {
          t.equal(outputMessage, inputMessage)
        }),
        exit: function (code) {
          t.equals(code, 0)
          t.end()
        }
      }
    })

  fdk.handle(function (body, ctx) {
    t.equal(body, inputMessage)
    return body
  })
})

test('default function json body from stdin', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const inputMessageJSON = {'testMessage': 'message'}
  const inputMessage = JSON.stringify(inputMessageJSON)

  fdk.__set__(
    {
      fs: new MockFs(t, '/dev/stdin', inputMessage),
      process: {
        env: {'FN_HEADER_CONTENT_TYPE': 'application/json'},
        stdin: new MockStdin(function () {
          t.fail('stdin read')
        }),
        stdout: new MockStdOutput(function () {
        }),
        stderr: new MockStdOutput(function (outputMessage) {
          t.equal(outputMessage, inputMessage)
        }),
        exit: function (code) {
          t.equals(code, 0)
          t.end()
        }
      }
    })

  fdk.handle(function (body, ctx) {
    t.deepEqual(body, inputMessageJSON)
    return body
  })
})

/*
 *  JSON format tests
 */

test('build JSON context', function (t) {
  let fdk = rewire('../fn-fdk.js')

  const appName = 'test'
  const fnmemory = '128'
  const fnpath = '/testfn'
  const fntype = 'sync'
  const env = {
    'CONFIG_VAR': 'config-val',
    'FN_PATH': fnpath,
    'FN_FORMAT': 'json',
    'FN_APP_NAME': appName,
    'FN_MEMORY': fnmemory,
    'FN_TYPE': fntype
  }

  const contentType = 'application/json'
  const method = 'POST'
  const requestUrl = 'http://localhost:8080/r/myapp/hello'
  const callId = '01C4EQBEEF47WGA00000000000'
  const deadline = '2018-01-17T22:26:49.387Z'
  const myheaderval = 'myheadervalue'
  const request = {
    'call_id': callId,
    'content_type': contentType,
    'protocol': {
      'type': 'sync',
      'request_url': requestUrl,
      'headers': {
        'Fn_deadline': [deadline],
        'Fn_method': [method],
        'Content-Type': [contentType],
        'MY_HEADER': [myheaderval]
      }
    }
  }

  const JSONContext = fdk.__get__('JSONContext')
  let ctx = new JSONContext(env, request)

  t.equal(ctx.getConfig('CONFIG_VAR'), 'config-val')
  t.equal(ctx.appName, appName, 'appName')
  t.equal(ctx.callId, callId, 'callId')
  t.equal(ctx.deadline, deadline, 'deadline')
  t.equal(ctx.format, 'json', 'format')
  t.equal(ctx.memory, parseInt(fnmemory), 'memory')
  t.equal(ctx.path, fnpath, 'path')
  t.equal(ctx.type, fntype, 'type')
  t.equal(ctx.contentType, request.content_type, 'content_type')
  t.equal(ctx.protocol.requestUrl, requestUrl, 'requestUrl')
  t.equal(ctx.protocol.method, method, 'method')
  t.deepEqual(ctx.protocol.headers, {
    'Content-Type': [contentType],
    'My-Header': [myheaderval]
  }, 'headers')

  t.end()
})

test('JSON function invocation with context', function (t) {
  let fdk = rewire('../fn-fdk.js')

  const payload = {msg: 'Jane'}
  const callId = '01C433NT3V47WGA00000000000'
  const request = {
    'body': JSON.stringify(payload),
    'content_type': 'application/json',
    'call_id': callId,
    'protocol': {
      'request_url': 'http://a.proto/r/path',
      'headers': {
        'Content-Type': ['application/json']
      }
    }
  }

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'},
        stderr: new MockStdOutput(function () {
        }),
        stdin: new MockStdin(JSON.stringify(request)),
        stdout: new MockStdOutput(function () {
        })
      }
    })

  fdk.handle(function (body, ctx) {
    t.deepEqual(body, payload)
    t.equal(ctx.callId, callId, 'callId context value')
    t.equal(ctx.contentType, 'application/json', 'content_type')
    t.end()
    return ''
  })
})

test('JSON function invocation with non-JSON content', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const payload = 'Jane'
  const callId = '01C433NT3V47WGA00000000000'
  const request = {
    'body': payload,
    'content_type': 'text/plain',
    'call_id': callId,
    'protocol': {
      'request_url': 'http://a.proto/r/path',
      'headers': {
        'Content-Type': ['application/json']
      }
    }
  }

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'},
        stderr: new MockStdOutput(function () {
        }),
        stdin: new MockStdin(JSON.stringify(request)),
        stdout: new MockStdOutput(function () {
        })
      }
    })

  fdk.handle(function (body, ctx) {
    t.equal(body, payload)
    t.equal(ctx.callId, callId, 'call_id context value')
    t.end()
    return ''
  })
})

test('JSON function invocation no context', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const payload = 'Jane'
  const request = {
    'body': JSON.stringify(payload),
    'content_type': 'application/json',
    'call_id': '_call_id_',
    'protocol': {
      'request_url': 'http://a.proto/r/path',
      'headers': {}
    }
  }

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'},
        stderr: new MockStdOutput(function () {
        }),
        stdin: new MockStdin(JSON.stringify(request)),
        stdout: new MockStdOutput(function () {
        })
      }
    })

  fdk.handle(function (body) {
    // function does not declare context param
    t.equal(body, payload, 'fn function invoked with body')
    return ''
  })

  t.end()
})

test('JSON function body and response', function (t) {
  let fdk = rewire('../fn-fdk.js')
  const payload = 'Jane'

  const inputBody = JSON.stringify(payload)
  const callId = '1'
  const contentType = 'application/json'
  const request = {
    'body': inputBody,
    'content_type': contentType,
    'call_id': callId,
    'protocol': {
      'headers': {
        'Content-Type': [contentType]
      }
    }
  }
  const expectedOutputContentType = contentType
  const expectedOutputPayload = payload + callId
  const expectedJSONResponse = buildJSONResponse(expectedOutputPayload, expectedOutputContentType)

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'},
        stderr: new MockStdOutput(function (data) {
          process.stderr.write(data)
        }),
        stdin: new MockStdin(JSON.stringify(request)),
        stdout: new MockStdOutput(function (chunk) {
          let response = JSON.parse(chunk)
          t.deepEqual(response, expectedJSONResponse)
          t.end()
        })
      }
    })

  fdk.handle(function (body, ctx) {
    t.equal(body, payload) // parsed JSON
    return body + ctx.callId
  })
})

test('JSON format function exception', function (t) {
  let fdk = rewire('../fn-fdk.js')

  const request = {
    'body': JSON.stringify(''),
    'content_type': 'application/json',
    'protocol': {
      'headers': {
        'Fn_call_id': ['1']
      }
    }
  }
  // FDK error message constant
  const expectedBody = fdk.__get__('fnFunctionExceptionMessage')
  const expectedOutputContentType = 'application/text'
  const expectedJSONResponse = buildJSONErrorResponse(expectedBody, expectedOutputContentType)

  fdk.__set__(
    {
      process: {
        env: {'FN_FORMAT': 'json'},
        stderr: new MockStdOutput(function () {
        }),
        stdin: new MockStdin(JSON.stringify(request)),
        stdout: new MockStdOutput(function (chunk) {
          var response = JSON.parse(chunk)
          t.deepEqual(expectedJSONResponse, response)
          t.end()
        })
      }
    })

  fdk.handle(function (body, ctx) {
    throw new Error('fail on purpose')
  })
})

// /**
//  * Redirect standard io
//  */
// test('Redirect stdout and prefix', function(t) {
//   t.plan(1);
//   var fdk = rewire('../fn-fdk.js')
//     , payload = "Tom";

//   fdk.__set__({
//     fs: new MockFs(t, '/dev/stdin', payload),
//     process: {
//       env: {},
//       stdin:  new MockStdin(function() {
//         t.fail('stdin read');  // TODO: should stdin access throw exception?
//       }),
//       stdout: new MockStdOutput(function() {
//         t.fail('output on stdout');
//       }),
//       stderr: new MockStdOutput(function (line) {
//         t.equal('[out] ' + payload);
//       })
//     }
//   });

//   fdk.handle(function(body, ctx) {
//     process.stdout.write(body);
//   });
//   t.end();
// });

// test('Redirect stderr and prefix', function(t) {
//   t.plan(1);
//   var fdk = rewire('../fn-fdk.js')
//     , payload = "Tom";

//   fdk.__set__({
//     fs: new MockFs(t, '/dev/stdin', payload),
//     process: {
//       env: {},
//       stdin:  new MockStdin(function() {
//         t.fail('stdin read'); // TODO: should stdin access throw exception?
//       }),
//       stdout: new MockStdOutput(function() {
//         t.fail('output on stdout');
//       }),
//       stderr: new MockStdOutput(function (line) {
//         t.equal('[err] ' + payload);
//       })
//     }
//   });

//   fdk.handle(function(body, ctx) {
//     process.stderr.write(body);
//   });
//   t.end();
// });

/**
 * Utilities
 */

function buildJSONResponse (payload, contentType) {
  return {
    body: JSON.stringify(payload),
    content_type: contentType,
    protocol: {
      status_code: 200,
      headers: {}
    }
  }
}

function buildJSONErrorResponse (errorMessage, contentType) {
  return {
    body: errorMessage,
    content_type: contentType,
    protocol: {
      status_code: 500
    }
  }
}
