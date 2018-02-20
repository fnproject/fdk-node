// please leave here in root, makes for easy testing, can just do `fn run`
const fdk = require('./fn-fdk.js')

fdk.handle(function(input, ctx) {
    var name = 'World';
    if (input.name) {
      name = input.name;
    }
    response = {'message': 'Hello ' + name}
    return response
})
