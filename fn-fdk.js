/*

  Usage: handle(function(body, context))
*/

var JSONStream = require('JSONStream')
  , es = require('event-stream')
  , fs = require('fs')
  

exports.handle = function(handler) {
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

  var ctx = buildContext();
  // TODO: handle async
  fdkhandler(handler, ctx);
}

function buildContext() {
  // TODO: build context
  return {};
}

function handleDefault(callback, context) {
  try {
    var input = fs.readFileSync('/dev/stdin').toString();
    // TODO: capture stdin and stderr and label and route to Fn logs
    var output = callback(input, context);
    process.stdout.write(output);
  } catch(e) {
    console.error(e.message);
  }
}

function handleJSON(callback, context) {
  // Read JSON from standard input looking for the body property
  // of the incoming request objects, construct a response, and 
  // write that to standard output.
  process.stdin
    .pipe(
      // look for root 'body' property
      JSONStream.parse(['body']))
    .pipe(
      es.mapSync(function(body){
        // TODO: error handling
        var response = callback(body);
        return {
          body: response,
          content_type: 'application/text',
          protocol: {
            status_code: 200
          }
        };
      }))
    .pipe(JSONStream.stringify(false))
    .pipe(process.stdout);
}
