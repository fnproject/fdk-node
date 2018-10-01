# Fn Function Developer Kit for Node.js

This Function Developer Kit makes it easy to deploy Node.js functions to Fn.
It currently supports default (cold) and hot functions using the JSON format.

## Creating a Node Function

Writing a Node.js function is simply a matter of writing a handler function
that you pass to the FDK to invoke each time your function is called.

Start by creating a node function with `fn init` and installing the FDK:

```sh
fn init --runtime node nodefunc
cd nodefunc
```

This creates a simple hello world function in `func.js`:

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input){
  let name = 'World';
  if (input.name) {
    name = input.name;
  }
  return {'message': 'Hello ' + name}
})
```

The handler function takes the string input that is sent to the function
and returns a response string.  Using the FDK you don't have to worry about reading
input from standard input and writing to standard output to return your response.
The FDK let's you focus on your function logic and not the mechanics.

Now run it!

```sh
fn deploy --local --app fdkdemo 
fn invoke fdkdemo nodefunc 
```

Now you have a basic running Node function that you can modify and add what you want.


```sh
echo -n "Tom" | fn invoke fdkdemo nodefunc
```


You should see the result

```sh
{"message": "Hello Tom"}
```

## Function Context

Function invocation context details are available through an optional function argument.
To receive a context object, simply add a second argument to your handler function.
in the following example the `callID` is obtained from the context and included in 
the response message:

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input, ctx){
  let name = 'World';
  if (input) {
    name = input;
  }
  return 'Hello ' + name + ' from Node call ' + ctx.callID + '!';
})
```


The context contains other context information about the request such as: 

* `ctx.config` : An Object containing function config variables (from the environment ) (read only)
* `ctx.headers` : an object containing input headers for the event as lists of strings (read only)
* `ctx.deadline` : a `Date` object indicating when the function call must be processed by 
* `ctx.callID` : The call ID of the current call 
* `ctx.fnID` : The Function ID of the current function 
* `ctx.memory` : Amount of ram in MB allocated to this function 
* `ctx.contentType` : The incoming request content type (if set, otherwise null)
* `ctx.setResponseHeader(key,values...)` : Sets a response header to one or more values 
* `ctx.addResponseHeader(key,values...)` : Appends values to an existing response header
* `ctx.responseContentType` set/read the response content type of the function (read/write)
* `ctx.httpGateway`  The HTTP Gateway context for this function (if set) see `HTTPGatewayContext` below  

 

## Asynchronous function responses

You return an asynchronous response from a function by returning a Javascript `Promise` from the function body: 

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input, ctx){
  return new Promise((resolve,reject)=>{
     setTimeout(()=>resolve("Hello"),1000);
  });
})
```

You can also  use `async`/`await` calling conventions in functions. 
 
## Handling non-json input and output

By default the FDK will try and convert input into a JSON object, or fall back to its string format otherwise. 

Likewise by default the output of a function will be treated as a JSON object and converted using JSON.stringify. 


To change the handling of the input you can add an additional `options` parameter to `fdk.handle` that specifies the input handling strategy: 

```javascript
function myfunction(input,ctx){}

fdk.handle(myfunction, {inputMode: 'string'})
```

valid input modes are: 
*  `json` (the default) attempts to parse the input as json or falls back to raw (possibly binary) string value otherwise
* `string` always treats input as a string 
* `buffer` reads input into a `Buffer` object and passes this to your function 

To change the output handling of your function from the default you should wrap the result value using a response decorator: 

```javascript
function myfunction(input,ctx){
   return fdk.rawResult("Some string")
}

fdk.handle(myfunction)
```

the available decorators are: 
* `rawResult({string|Buffer})` passes the result directly to the response - the value can be a string or a buffer - this will not encode quotes on string objects 
* `streamResult({ReadableStream})` pipes the contents of a `ReadableStream` into the output - this allows processing of data from files or HTTP responses 


## Using HTTP headers and setting HTTP status codes
You can read http headers passed into a function invocation using `ctx.protocol.header(key)`, this returns the first header value of the header matching `key` (after canonicalization)  and `ctx.protocol.headers` which returns an object containing all headers.  

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input, ctx){
  
  let hctx = ctx.httpGateway
  console.log("Request URL" , hctx.requestURL)
  
  console.log("Authorization header:" , hctx.getHeader("Authorization"))
  console.log( hctx.headers) // prints e.g. { "Content-Type": ["application/json"],"Accept":["application/json","text/plain"] } 
})
```

Outbound headers and the HTTP status code can be modified in a similar way:  

```javascript
const fdk=require('@fnproject/fdk');

fdk.handle(function(input, ctx){
    let hctx = ctx.httpGateway

   hctx.setHeader("Location","http://example.com")
   hctx.statusCode = 302
})
```

The `HTTPGatewayContext` object has a similar interface to `Context` but accesses only the HTTP headers of the function: 

* `hctx.requestURL` : Get the http request URL of the function as received by the gateway (null if not set)
* `hctx.method` : Get the HTTP request method used to invoke the gateway 
* `hctx.headers` : Get the HTTP headers of the incoming request (read-only)
* `hctx.statusCode` : Set the the HTTP status code of the HTTP resposne 
& `hctx.setResponseHeader(key,values..)`, `hctx.addResponseHeader(key,values)` Set/add response headers 

## Fn and Node.js Dependencies
Fn handles Node.js dependencies in the following way:
* If a `package.json` is present without a `node_modules` directory, an Fn build runs an `npm install` within the build process and installs your dependencies.
* If the `node_modules` is present, Fn assumes you have provided the dependencies yourself and no installation is performed.
