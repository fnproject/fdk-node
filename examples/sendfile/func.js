const fdk = require('@fnproject/fdk')
const fs = require('fs')
/**
 * Sends a file to the output as a stream - this does not load the whole file into memory
 */
fdk.handle(function (input, ctx) {
  ctx.responseContentType = 'text/html'
  return fdk.streamResult(fs.createReadStream('testfile.html'))
})
