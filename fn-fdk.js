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
    // if nothing returned then return empty string
    output = output ? output : '';
    process.stdout.write(output);
  } catch(e) {
    process.stderr(e.message);
  }
}

function handleJSON(fnfunction) {
  try {
    process.stdin
      .pipe(
        // parse out a request at at time
        JSONStream.parse())
      .pipe(
        es.mapSync(function(request){          
          try {
            var ctx = new JSONContext(request);
            // TODO: support user setting response headers
            // TODO: capture stdin and stderr and label and route to Fn logs
            var output = fnfunction(JSON.parse(request.body), ctx);
            // if nothing returned then return empty string
            output = output ? output : '';
            return buildJSONResponse(output, ctx);
          } catch (error) {
            return buildJSONError(error);
          }
        }))
      .pipe(JSONStream.stringify(false))
      .pipe(process.stdout);
  } catch (error) {
    return buildJSONError(e);
  }

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
function buildJSONError(error) {
  process.stderr.write(error.stack);
  return {    
    body: fnFunctionExceptionMessage,
    content_type: "application/text",
    headers: {
      status_code: 500
    }
  };
}

