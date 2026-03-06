#include <node_api.h>

/*
 * Minimal Custom N-API Addon (C)
 *
 * Required by handler:
 *   - add(a, b) -> number
 *
 * No arch() export needed anymore.
 */

static napi_value Add(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];

  napi_status status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
  if (status != napi_ok || argc < 2) {
    napi_throw_type_error(env, NULL, "add(a, b) requires 2 numeric arguments");
    return NULL;
  }

  double a, b;

  if (napi_get_value_double(env, args[0], &a) != napi_ok) {
    napi_throw_type_error(env, NULL, "First argument must be a number");
    return NULL;
  }

  if (napi_get_value_double(env, args[1], &b) != napi_ok) {
    napi_throw_type_error(env, NULL, "Second argument must be a number");
    return NULL;
  }

  napi_value result;
  if (napi_create_double(env, a + b, &result) != napi_ok) {
    napi_throw_error(env, NULL, "Failed to create result");
    return NULL;
  }

  return result;
}

static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;

  if (napi_create_function(env, "add", NAPI_AUTO_LENGTH, Add, NULL, &fn) != napi_ok) {
    napi_throw_error(env, NULL, "Unable to create function");
    return NULL;
  }

  if (napi_set_named_property(env, exports, "add", fn) != napi_ok) {
    napi_throw_error(env, NULL, "Unable to export function");
    return NULL;
  }

  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)