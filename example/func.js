const fdk = require('@floatydog/fn-fdk')

fdk.handle(function (input, ctx) {
  return 'Hello' + JSON.stringify(input)
})
