const fdk = require('@fnproject/fdk')

fdk.handle(function (input, ctx) {
  let name = 'World'
  if (input.name) {
    name = input.name
  }
  return { 'message': 'Hello ' + name }
})
