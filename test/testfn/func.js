const fdk = require('fn-fdk')

fdk.handle(function (input, ctx) {
  return 'Hello' + JSON.stringify(input)
})