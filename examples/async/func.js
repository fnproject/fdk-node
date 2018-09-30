const fdk = require('@fnproject/fdk')

function asyncFunction (x, y) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve(x + y), 100)
  })
}

/**
 *  Handlers work fine with async functions or any function that returns a promise
 */
fdk.handle(async function (input, ctx) {
  let val = await asyncFunction(1, 2)

  return asyncFunction(val, 3)
})
