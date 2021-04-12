const fdk = require('@fnproject/fdk')

// ZipkinJS core components.
const {
  ExplicitContext,
  Tracer,
  TraceId,
  BatchRecorder,
  jsonEncoder,
  sampler,
  option
} = require('zipkin')

// An HTTP transport for dispatching Zipkin traces.
const { HttpLogger } = require('zipkin-transport-http')

fdk.handle(async function (input, ctx) {
  var tracer = createOCITracer(ctx)

  var result
  // Start a new 'scoped' server handling span.
  await tracer.scoped(async function () {
    // Fetch some resource
    result = await tracer.local('fetchResource', () => {
      return fetchResource()
    })
    // Perform some processing
    result = await tracer.local('processResource', () => {
      return someComputation(result)
    })
    // Update some resource
    result = await tracer.local('updateResource', () => {
      return updateResource(result)
    })
    await flush()
  })

  return result
})

// ----------------------------------------------------------------------------
// App Simulation Functions
//

/**
 * Simulate fetching some required resource. This could be another OCI service
 * or an external call.
 *
 * @returns A Promise with the success or failure of the operation.
 */
function fetchResource () {
  return simulate(1000, { fetchResource: 'OK' })
}

/**
 * Simulate some work. This could be another OCI service.
 *
 * @returns A Promise with the success or failure of the operation.
 */
async function someComputation (toReturn) {
  var i
  for (i = 0; i < 5; i++) {
    await simulate(1000)
  }
  toReturn.processResource = 'OK'
  return toReturn
}

/**
 * Simulate updating some resource. This could be another OCI service or an
 * external call.
 *
 * @returns A Promise with the success or failure of the operation.
 */
async function updateResource (toReturn) {
  await simulate(500)
  toReturn.updateResource = 'OK'
  return toReturn
}

/**
 * A helper function to simulate an operation that takes a specified amount of time.
 *
 * @param {*} ms The simulated time for the activity in milliseconds.
 * @returns      A promise that resolves when the simulated activity finishes.
 */
function simulate (ms, result) {
  return new Promise(resolve => setTimeout(resolve, ms, result))
}

/**
 * Functions service may freeze or terminate the container on completion.
 * This function gives extra time to allow the runtime to flush any pending traces.
 * See: https://github.com/openzipkin/zipkin-js/issues/507
 *
 * @returns A Promise to await on.
 */
function flush () {
  return new Promise(resolve => setTimeout(resolve, 1000))
}

// ----------------------------------------------------------------------------
// OpenZipkin ZipkinJS Utility Functions
//

/**
 * Creates a basic Zipkin Tracer using values from context of the function
 * invocation.
 *
 * @param {*} ctx The function invocation context.
 * @returns       A configured Tracer for automatically tracing calls.
 */
function createOCITracer (ctx) {
  // An OCI APM configured Tracer
  //
  const tracingCxt = ctx.tracingContext
  const tracer = new Tracer({
    ctxImpl: new ExplicitContext(),
    recorder: new BatchRecorder({
      logger: new HttpLogger({
        // The configured OCI APM endpoint is available in the function
        // invocation context.
        endpoint: tracingCxt.traceCollectorUrl,
        jsonEncoder: jsonEncoder.JSON_V2
      })
    }),
    // APM Dimensions that should be included in all traces can be configured
    // directly on Tracer.
    defaultTags: createOCITags(ctx),
    // A custom sampling strategy can be defined.
    sampler: createOCISampler(ctx),
    localServiceName: tracingCxt.serviceName,
    supportsJoin: true,
    traceId128Bit: true
  })

  // The initial function invocation trace identifiers can be added directly.
  // If this is not defined a default TraceId is created.
  const traceId = createOCITraceId(tracer, ctx)
  tracer.setId(traceId)
  return tracer
}

/**
 * A ZipkinJS 'TraceId' can be created directly from the function invocation
 * context.
 *
 * @param {*} ctx The function invocation context.
 * @returns       A ZipkinJS 'TraceId' created from the invocation context.
 */
function createOCITraceId (tracer, ctx) {
  const tracingCxt = ctx.tracingContext
  if (tracingCxt.traceId && tracingCxt.spanId) {
    return new TraceId({
      traceId: tracingCxt.traceId,
      spanId: tracingCxt.spanId,
      sampled: new option.Some(tracingCxt.sampled),
      debug: new option.Some(tracingCxt.debug),
      shared: false
    })
  } else {
    return tracer.createRootId(
      new option.Some(tracingCxt.sampled),
      new option.Some(tracingCxt.debug)
    )
  }
}

/**
 * A ZipkinJS 'TraceId' can be crated directly from the function invocation
 * context.
 *
 * This configurations will automatically add the function meta-data as APM
 * dimensions to each trace. Function environment variable and other dimensions
 * could also be added.
 *
 * @param {*} ctx The function invocation context.
 * @returns       A map of key-value pairs, that will be added as APM
 *                dimensions to the traces.
 */
function createOCITags (ctx) {
  return {
    appID: ctx.appID,
    appName: ctx.appName,
    fnID: ctx.fnID,
    fnName: ctx.fnName
  }
}

/**
 * A ZipkinJS 'Sampler' can be created directly from the function invocation
 * context.
 *
 * This configuration will only create a trace if the function is configured
 * for tracing.
 *
 * @param {*} ctx The function invocation context.
 * @returns       A ZipkinJS 'TraceId' created from the invocation context.
 */
function createOCISampler (ctx) {
  return new sampler.Sampler((traceId) => ctx.tracingContext.isEnabled)
}
