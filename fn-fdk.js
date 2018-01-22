/*

  Usage: handle(function(body, context))
*/

const JSONStream = require('JSONStream')
  , es = require('event-stream')
  , fs = require('fs')
  , { DefaultContext } = require('./lib/context.js')
  , { JSONContext } = require('./lib/context.js')
  , fnFunctionExceptionMessage = 'Exception in function--consult logs for details';
  

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
    var input = fs.readFileSync('/dev/stdin').toString();
    var ctx = new DefaultContext(process.env);
    // TODO: capture stdin and stderr and label and route to Fn logs
    var output = fnfunction(input, ctx);
    process.stdout.write(output);
  } catch(e) {
    process.stderr(e.message);
  }
}

function handleJSON(fnfunction) {
  process.stdin
    .pipe(
      // parse out a request at at time
      JSONStream.parse())
    .pipe(
      es.mapSync(function(request){
        var ctx = new JSONContext(request);
        // TODO: support user setting response headers
        var result, fnFuncError;
        try {
          // TODO: Capture function std io
          result = fnfunction(request.body, ctx);
        } catch (error) {
          fnFuncError = error;
        }
        if (!fnFuncError) {
          return buildJSONResponse(result, ctx);
        } else {
          return buildJSONError(fnFuncError, ctx);
        }
      }))
    .pipe(JSONStream.stringify(false))
    .pipe(process.stdout);
}


function buildJSONResponse(result, context) {
  var body = JSON.stringify(result);
  return {
    body: body,
    // assume same content type as request 
    // TODO: allow specifiction
    content_type: context.getConfig('Content-Type'),
    headers: {
      status_code: 200
    }
  };
}

// TODO: confirm structure of error response
function buildJSONError(error, context) {
  return {    
    body: 'Exception in function--consult logs for details',
    content_type: "application/text",
    headers: {
      status_code: 500
    }
  };
}