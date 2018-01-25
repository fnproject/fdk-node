"use strict";
/*
  Usage: handle(function(body, context))
*/

const JSONParser = require('jsonparse')
    , fs = require('fs')
    , {DefaultContext, JSONContext} = require('./lib/context.js')
    , fnFunctionExceptionMessage = 'Exception in function--consult logs for details';

exports.handle = function (fnfunction) {
    let fn_format = process.env["FN_FORMAT"] || "";
    let fdkhandler;

    // format has been explicitly specified
    switch (fn_format.toLowerCase()) {
        case "json" :
            fdkhandler = handleJSON;
            break;
        case "default":
        case "":
            fdkhandler = handleDefault;
            break;
        default:
            console.log("Unsupported format " + fn_format);
            process.exit(1);
            return;
    }

    // TODO: handle async
    fdkhandler(fnfunction)
};


function extractRequestBody(content_type,body){
    if (content_type.toLowerCase().startsWith("application/json")) {
        console.debug(`Parsing JSON body: '${body}'`)
        return JSON.parse(body);
    }
    return body;

}

function handleDefault(fnfunction) {
    try {
        let input = fs.readFileSync('/dev/stdin').toString();

        let ctx = new DefaultContext(process.env);
        // TODO: capture stdin and stderr and label and route to Fn logs
        let output = fnfunction(extractRequestBody(ctx.content_type,input), ctx);
        // if nothing returned then return empty string
        output = output ? output : '';
        process.stdout.write(output);
        process.exit(0);
    } catch (e) {
        process.stderr.write(e.message);
        process.exit(1);
    }
}

function handleJSON(fnfunction) {
    let parser = new JSONParser();


    parser._push = parser.push;
    parser._pop = parser.pop;
    let depth = 0;
    parser.push = function () {
        depth++;
        this._push();
    };
    parser.pop = function () {
        depth--;
        this._pop();
    };



    let realStdout = process.stdout;
    process.stdout = process.stderr;

    process.stdin.on("data", function (data) {
        parser.write(data);
    });



    parser.onError = function (error) {
        console.log("Invalid JSON input event, exiting", error);
        realStdout.write(buildJSONError(error, ctx));
        process.exit(1);
    };

    parser.onValue = function (request) {
        if(depth !==0){
            return;
        }

        let ctx = new JSONContext(request);

        let execPromise = new Promise(function (resolve, reject) {
            try {
                // TODO: support user setting response headers
                // TODO: capture stdin and stderr and label and route to Fn logs

                console.debug("request", request);

                let input = extractRequestBody(ctx.content_type,request.body);


                resolve(fnfunction(input, ctx));
            } catch (error) {
                reject(error);
            }
        });

        execPromise.then(function (result) {
            realStdout.write(buildJSONResponse(result, ctx));
        }, function (error) {
            realStdout.write(buildJSONError(error, ctx));
        });
    };
}

function buildJSONResponse(result, context) {
    let body = JSON.stringify(result);
    return JSON.stringify({
                              body: body,
                              // assume same content type as request
                              // TODO: allow specifiction
                              content_type: context.getConfig('Content-Type'),
                              protocol: {
                                  status_code: 200
                              }
                          });
}

// TODO: confirm structure of error response
function buildJSONError(error) {
    console.log("Error in function", error);
    return JSON.stringify({
                              body: fnFunctionExceptionMessage,
                              content_type: "application/text",
                              protocol: {
                                  status_code: 500
                              }
                          });
}

