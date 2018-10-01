const fdk = require('@fnproject/fdk')

/**
 * Redirects a user to a URL by accesing the HTTP gateway context associated with a request
 */
fdk.handle(function (input, ctx) {
  const hctx = ctx.httpGateway
  console.log('User agent', hctx.getHeader('User-Agent'))
  hctx.setResponseHeader('Location', 'http://fnproject.io')
  hctx.statusCode = 302
})
