const fdk = require('@fnproject/fdk')

fdk.handle(function (input, ctx) {
  return 'Hello ' + JSON.stringify(input)
})
