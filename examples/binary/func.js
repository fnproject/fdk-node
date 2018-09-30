const fdk = require('@fnproject/fdk')

/**
 * Setting the input mode to 'buffer' gives you input as a Buffer rather than a string or json
 */
fdk.handle(async function (buf, ctx) {
  for (let i = 0; i < buf.length; i++) {
    buf[i] = buf[i] + 128 % 255
  }
  // Setting a content type other than JSON will result
  ctx.responseContentType = 'application/octet-stream'
  return fdk.rawResponse(buf)
}, {inputMode: 'buffer'})
