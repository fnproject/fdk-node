'use strict'
/*
  Usage: handle(function(body, context))
*/

const JSONParser = require('jsonparse')
const {DefaultContext, JSONContext} = require('./lib/context.js')
const fnFunctionExceptionMessage = 'Exception in function--consult logs for details'

exports.handle = function (fnfunction) {
  let fnFormat = process.env['FN_FORMAT'] || ''
  let fdkHandler

  // format has been explicitly specified
  switch (fnFormat.toLowerCase()) {
    case 'json' :
      fdkHandler = handleJSON
      break
    case 'default':
    case '':
      fdkHandler = handleDefault
      break
    default:
      console.warn(
        `The Node.js FDK does not support the '${fnFormat}' format, change the function format to 'json' or 'default'. Exiting')`)
      process.exit(2)
  }

  fdkHandler(fnfunction)
}

function extractRequestBody (contentType, body) {
  if (contentType.toLowerCase().startsWith('application/json')) {
    return JSON.parse(body)
  }
  return body
}

function handleDefault (fnFunction) {
  try {
    let len = 0
    let chunks = []

    process.stdin.on('readable', () => {
      let chunk

      while ((chunk = process.stdin.read())) {
        chunks.push(chunk)
        len += chunk.length
      }
    })

    let realStdout = process.stdout
    process.stdout.write = process.stderr.write

    process.stdin.on('end', () => {
      let input = Buffer.concat(chunks, len).toString()

      let outCtx = {content_type: ''}

      let ctx = new DefaultContext(input, process.env, outCtx)
      outCtx.content_type = ctx.contentType

      new Promise(function (resolve, reject) {
        try {
          input = extractRequestBody(ctx.contentType, input)
        } catch (error) {
          reject(error)
        }
        return resolve(fnFunction(input, ctx))
      }).then(function (result) {
        realStdout.write(convertResult(result, outCtx))
        process.exit(0)
      }, function (error) {
        console.warn('Error in function: ', error)
        realStdout.write(fnFunctionExceptionMessage)
        process.exit(1)
      })
    })
  } catch (e) {
    process.stderr.write(e.message)
    process.exit(1)
  }
}

function handleJSON (fnfunction) {
  let parser = new JSONParser()

  let realStdout = process.stdout
  process.stdout.write = process.stderr.write

  parser._push = parser.push
  parser._pop = parser.pop
  let depth = 0
  parser.push = function () {
    depth++
    this._push()
  }
  parser.pop = function () {
    depth--
    this._pop()
  }

  process.stdin.on('data', function (data) {
    parser.write(data)
  })

  parser.onError = function (error) {
    console.warn('Invalid JSON input event, exiting', error)
    realStdout.write(buildJSONError())
    process.exit(1)
  }

  parser.onValue = function (request) {
    if (depth !== 0) {
      return
    }
    let outCtx = {content_type: request.content_type}
    let httpOutCtx = {status_code: 200, headers: {}}

    let ctx = new JSONContext(process.env, request, outCtx, httpOutCtx)

    new Promise(function (resolve, reject) {
      let input
      try {
        input = extractRequestBody(ctx.contentType, request.body)
      } catch (error) {
        reject(error)
      }
      return resolve(fnfunction(input, ctx))
    }).then(function (result) {
      realStdout.write(buildJSONResponse(result, outCtx, httpOutCtx))
    }, function (error) {
      console.warn('Error in function:', error)
      realStdout.write(buildJSONError())
    })
  }
}

function convertResult (result, contextout) {
  if (contextout.content_type.startsWith('application/json')) {
    return JSON.stringify(result)
  } else {
    return result !== null ? result.toString() : ''
  }
}

function buildJSONResponse (result, contextout, protoout) {
  let body = convertResult(result, contextout)

  return JSON.stringify(
    {
      body: body,
      content_type: contextout.content_type,
      protocol: {
        status_code: protoout.status_code,
        headers: protoout.headers
      }
    })
}

function buildJSONError () {
  return JSON.stringify(
    {
      body: fnFunctionExceptionMessage,
      content_type: 'text/plain',
      protocol: {
        status_code: 500
      }
    })
}
