// please leave here in root, makes for easy testing, can just do ` echo '{"name":"travis"}' | fn run | jq .message`

const fdk = require('./fn-fdk.js')

fdk.handle(function (input, ctx) {
  let name = 'World'
  if (input.name) {
    name = input.name
  }
  ctx.setResponseHeader('My-Header', 'Foo')
  ctx.httpGateway.setResponseHeader('My-Header', 'foo', 'bar')
  ctx.httpGateway.setResponseHeader('Content-Type', 'application/foo+json', 'bar')

  return {'message': 'Hello ' + name}
})
