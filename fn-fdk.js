/*

  Usage: handle(function(body, context))
*/

var JSONStream = require('JSONStream')
  , es = require('event-stream')
  , fs = require('fs')
  

exports.handle = function(fnfunction) {
  var fn_format = process.env.FN_FORMAT;
  var fdkhandler = handleDefault;

  if (fn_format) {
    // format has been explicitly specified
    switch (fn_format) {
      case "json" :
        fdkhandler = handleJSON;
        break;
      case "http" :
        // TODO: unsupported--HTTP 501
        break;
      default:
        // TODO: unknown format--HTTP 501
    }
  }

  // TODO: handle async
  fdkhandler(fnfunction)
}

function handleDefault(fnfunction) {
  try {
    var input = readStdIn();
    var ctx = buildEnvContext();
    // TODO: capture stdin and stderr and label and route to Fn logs
    var output = fnfunction(input, ctx);
    writeStdout(output);
  } catch(e) {
    writeStderr(e.message);
  }
}

function handleJSON(fnfunction) {
  process.stdin
    .pipe(
      // each object in stream
      JSONStream.parse())
    .pipe(
      es.mapSync(function(request){
        // TODO: error handling
        var ctx = buildJSONContext(request);
        // TODO: support user setting response headers
        var result = fnfunction(request.body, ctx);
        return buildJSONResponse(result, ctx);
      }))
    .pipe(JSONStream.stringify(false))
    .pipe(process.stdout);
}

function buildJSONResponse(result, context) {
  return {
    body: result,
    content_type: context['Content-Type'],
    protocol: {
      status_code: 200
    }
  };
}

function buildJSONContext(request) {
  var ctx = {};
  // root properties
  ctx.call_id = request.call_id;
  // header properties
  var headers = request.protocol.headers;
  for (var propertyName in headers) {
    var ctxKey = propertyName;
    if (propertyName.startsWith("Fn_")) {
      ctxKey = propertyName.substr(3,propertyName.length -1);
    }
    ctx[ctxKey] = headers[propertyName][0];
  }
  return ctx;
}

function buildEnvContext() {
  var ctx = {};
  for (var propertyName in process.env) {
    var ctxKey = propertyName;
    if (propertyName.startsWith("FN_")) {
      ctxKey = propertyName.substr(3,propertyName.length -1);
    }
    ctx[ctxKey] = process.env[propertyName];
  }
  return ctx;
}

function readStdIn() {
  return fs.readFileSync('/dev/stdin').toString();
}

function writeStdout(message) {
  process.stdout.write(message);
}

function writeStderr(message) {
  process.stderr.write(message);
}