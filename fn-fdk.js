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
            fdkhandler = handleJSON
            break;
        case "default":
        case "":
            fdkhandler = handleDefault;
            break;
        default:
            console.log("Unsupported format " + fn_format);
            process.exit(2);
            return;
    }

    // TODO: handle async
    fdkhandler(fnfunction)
};

function extractRequestBody(content_type, body) {
    if (content_type.toLowerCase().startsWith("application/json")) {
        console.debug(`Parsing JSON body: '${body}'`)
        return JSON.parse(body);
    }
    return body;
}

function handleDefault(fnfunction) {
    try {
        let input = fs.readFileSync('/dev/stdin').toString();
        let realStdout = process.stdout;
        process.stdout = process.stderr;

        let ctxout = {content_type: "application/json"};
        let ctx = new DefaultContext(process.env, ctxout);

        new Promise(function (resolve, reject) {
            resolve(fnfunction(extractRequestBody(ctx.content_type, input), ctx));

        }).then(function (data) {
            realStdout.write(convertResult(data, ctxout));
            process.exit(0);
        }, function (error) {
            console.log("error in ")
        });

    } catch (e) {
        process.stderr.write(e.message);
        process.exit(1);
    }
}

function handleJSON(fnfunction) {
    let parser = new JSONParser();

    let realStdout = process.stdout;
    process.stdout = process.stderr;

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

    process.stdin.on("data", function (data) {
        parser.write(data);
    });

    parser.onError = function (error) {
        console.log("Invalid JSON input event, exiting", error);
        realStdout.write(buildJSONError(error, ctx));
        process.exit(1);
    };

    parser.onValue = function (request) {
        if (depth !== 0) {
            return;
        }

        let ctx = new JSONContext(request);

        new Promise(function (resolve, reject) {
            let input;
            try {
                input = extractRequestBody(ctx.content_type, request.body);
            } catch (error) {
                reject(error);
            }
            resolve(fnfunction(input, ctx));
        }).then(function (result) {
            realStdout.write(buildJSONResponse(result, ctx));
        }, function (error) {
            realStdout.write(buildJSONError(error, ctx));
        });
    };
}

function convertResult(result, contextout) {
    if (contextout.content_type.startsWith("application/json")) {
        return JSON.stringify(result);
    } else {
        return result !== null ? result.toString() : "";
    }
}

function buildJSONResponse(result, contextout, protoout) {
    let body = convertResult(result, contextout);

    return JSON.stringify({
                              body: body,
                              content_type: contextout.content_type,
                              protocol: {
                                  status_code: protoout.status_code,
                                  headers: protoout.headers
                              }
                          });
}

// TODO: confirm structure of error response
function buildJSONError(error) {
    console.log("Error in function:", error);
    return JSON.stringify({
                              body: fnFunctionExceptionMessage,
                              content_type: "application/text",
                              protocol: {
                                  status_code: 500
                              }
                          });
}

