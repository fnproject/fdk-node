var test = require('tape');
var rewire = require('rewire');

const { Readable } = require('stream');
const { Writable } = require('stream');

class MockStdout extends Writable {
  constructor(options) {
    super(options);
    this.stub = options;
  }

  _write(chunk, encoding, callback) {
    this.stub(chunk, encoding, callback);
  }
}


class MockStdin extends Readable {
  constructor(opt) {
    super(opt);
    this.request = opt;
  }

  _read() {
    if (this.request) {
      const buf = Buffer.from(this.request, 'ascii');
      this.push(buf);
      this.request = null;
    } else {
      this.push(null);
    }
  }
}

/*
 *  Handler Dispatch tests 
 */

test('default dispatch no format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(1); 

  fdk.__set__({
    process: {
      env: {}
    },
    handleDefault: function(fnfunction) {
      t.pass('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.fail('JSON handler called')
    }
  });

  fdk.handle(null);

  t.end();
});

test('default dispatch with format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(1); 

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "default"}
    },
    handleDefault: function(fnfunction) {
      t.pass('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.fail('JSON handler called')
    }
  });

  fdk.handle(null);

  t.end();
});

test('JSON dispatch with format declared', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(1); 

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"}
    },
    handleDefault: function(fnfunction) {
      t.fail('default handler called')
    },
    handleJSON: function(fnfunction) {
      t.pass('JSON handler called')
    }
  });

  fdk.handle(null);

  t.end();
});

/*
 *  Default format tests
 */ 

test('build default context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(3); 

  var envVars = {}
    , one = "one"
    , two = "two"
    , three = "three";

  envVars[one] = one;
  envVars['FN_' + two] = two;
  envVars[three] = three;

  fdk.__set__({
    process: {
      env: envVars
    }
  });

  var ctx = fdk.__get__("buildEnvContext")();
  t.equals(ctx[one], one);
  t.equals(ctx[two], two, 'FN_ prefix should be stripped');
  t.equals(ctx[three], three);
});


test('default FN env var', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(2); 

  var inputMessage = ""
    , fnEnvKey = "ABCDE"
    , envKey = "FN_" + fnEnvKey
    , envValue = "12345"
    , fnfunction = function(body, ctx) {
        t.assert(ctx[fnEnvKey]);
        t.equals(ctx[fnEnvKey], envValue);
      }
    , envVars = {};

  envVars[envKey] = envValue;
  fdk.__set__({
    process: {
      env: envVars
    },
    readStdIn: function() {},
    writeStdout: function(_) {}
  });

  fdk.handle(fnfunction);

  t.end();
});

test('default non-FN env var', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(2); 

  var inputMessage = ""
    , envKey = "ABCDE"
    , envValue = "12345"
    , fnfunction = function(body, ctx) {
        t.assert(ctx[envKey]);
        t.equals(ctx[envKey], envValue);
      }
    , envVars = {};

  envVars[envKey] = envValue;
  fdk.__set__({
    process: {
      env: envVars
    },
    readStdIn: function() {},
    writeStdout: function(_) {}
  });

  fdk.handle(fnfunction);

  t.end();
});

test('default function invocation with context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(3); 

  var inputMessage = "testbody"
    , fnfunction = function(body, ctx) {
        // function delares both body and optional context
        t.assert(body, "fn function invoked with body")
        t.assert(ctx, "fn function invoked with context");
        return body;
      }

  fdk.__set__({
    process: {
      env: {}
    },
    readStdIn: function() {
      return inputMessage;
    },
    writeStdout: function(outputMessage) {
      t.equals(outputMessage, inputMessage);
    }
  });

  fdk.handle(fnfunction);

  t.end();
});

test('default function invocation no context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(2); 

  var inputMessage = "testbody"
    , fnfunction = function(body) {
        // function does not declare context param
        t.assert(body, "fn function invoked with body")
        return body;
      }

  fdk.__set__({
    process: {
      env: {}
    },
    readStdIn: function() {
      return inputMessage;
    },
    writeStdout: function(outputMessage) {
      t.equals(outputMessage, inputMessage);
    }
  });

  fdk.handle(fnfunction);

  t.end();
});

test('default function body from stdin', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(2); 

  var inputMessage = "testbody"
    , fnfunction = function(body, ctx) {
        t.equals(body, inputMessage);
        return body;
      }

  fdk.__set__({
    process: {
      env: {}
    },
    readStdIn: function() {
      return inputMessage;
    },
    writeStdout: function(outputMessage) {
      t.equals(outputMessage, inputMessage);
    }
  });

  fdk.handle(fnfunction);

  t.end();
});

/*
 *  JSON format tests
 */ 

test('build JSON context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(4); 

  var request = {
    "call_id": "01C433NT3V47WGA00000000000",
    "body" : "Jane", 
    "protocol": {
      "request_url": "\/r\/fdkdemo\/hello",
      "headers": {
        "Accept-Encoding": ["gzip"],
        "Fn_app_name": ["fdkdemo"],
        "Content-Type": ["application\/json"]
      }
    }
  };

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"}
    },
  });

  var ctx = fdk.__get__("buildJSONContext")(request);
  t.equals(ctx["call_id"], request["call_id"]);
  t.equals(ctx["Accept-Encoding"], request.protocol.headers["Accept-Encoding"][0]);
  t.equals(ctx["app_name"], request.protocol.headers["Fn_app_name"][0], "FN_ prefix should be stripped");
  t.equals(ctx["Content-Type"], request.protocol.headers["Content-Type"][0]);
});



test('JSON function invocation with context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(4); 

  var expectedBody = "Jane"
    , request = {
        "call_id": "01C433NT3V47WGA00000000000",
        "body" : expectedBody, 
        "protocol": {
          "request_url": "\/r\/fdkdemo\/hello",
          "headers": {
            "Accept-Encoding": ["gzip"],
            "Fn_app_name": ["fdkdemo"],
            "Content-Type": ["application\/json"]
          }
        }
      }
    , expectedResponse = expectedBody + request["call_id"];
  
  var fnfunction = function(body, ctx) {
        // function delares both body and optional context
        t.assert(body, "fn function invoked with body")
        t.assert(ctx, "fn function invoked with context");
        t.equals(body, expectedBody);
        // append call id to body to test using ctx
        return body + ctx["call_id"];
      }

  var mockstdin = new MockStdin(JSON.stringify(request));
  var mockstdout = new MockStdout(function (chunk) {
     t.equals(chunk.toString(), JSON.stringify(expectedResponse));
  });

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stdin: mockstdin,
      stdout: mockstdout
    },
    buildJSONResponse: function (result) {
      // just return whatever come from fnfunction
      return result;
    }
  });

  fdk.handle(fnfunction);
  // TODO: resolve async execution order to check t.end();
});

test('JSON function invocation no context', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(1); 

  var request = {
        "body": "Jane",
        "protocol": {
          "headers": {}
        }
      }
    , fnfunction = function(body) {
        // function does not declare context param
        t.assert(body, "fn function invoked with body")
        return body;
      }
    , mockstdin = new MockStdin(JSON.stringify(request))
    , mockstdout = new MockStdout(function (_) {});

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stdin: mockstdin,
      stdout: mockstdout
    }
  });

  fdk.handle(fnfunction);

  //t.end();
});

test('JSON function body from stdin', function(t) {
  var fdk = rewire('../fn-fdk.js');
  t.plan(2); 

  var inputBody = "Jane"
    , request = {
        "call_id": "1",
        "body": inputBody,
        "protocol": {
          "headers": {}
        }
      }
    , expectedOutputBody = inputBody + request["call_id"]
    , mockstdin = new MockStdin(JSON.stringify(request))
    , mockstdout = new MockStdout(function (chunk) {
        var response = JSON.parse(chunk);
        // TODO: verify entire response structure
        t.equals(expectedOutputBody, response.body);
    })
    , fnfunction = function(body, ctx) {
        t.equals(body, inputBody);
        return body + ctx["call_id"];
      }

  fdk.__set__({
    process: {
      env: {"FN_FORMAT": "json"},
      stdin: mockstdin,
      stdout: mockstdout
    }
  });

  fdk.handle(fnfunction);
  // t.end();
});
