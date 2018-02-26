const fdk = require('@fnproject/fdk')

fdk.handle(function (input, ctx) {
  var name = 'World'
  if (input.name) {
    name = input.name
  }
  var response = {'message': 'Hello ' + name}
  return response
})
