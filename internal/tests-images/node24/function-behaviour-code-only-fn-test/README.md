# function-behaviour-code-only-fn-test
This folder contains a test function used to validate **function behavior handling**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- success, error, and panic execution paths behave consistently
- FDK error mapping remains stable across runtime updates
- function invocation failures are surfaced correctly to the caller
- a non-default handler filename is accepted when referenced via Dockerfile entrypoint

---

## How the function works
- The function reads a JSON payload containing a `mode` field.
- Based on the mode, it triggers different behaviors:
  - `success` → returns a successful JSON response
  - `error` → throws a generic `Error`
  - `panic` → throws an error with `name = "RuntimeError"` to simulate a runtime panic path
- Invalid JSON input is treated as `{}` and defaults to `mode = "success"`.

---

## Input and Output

### Input (example)
```json
{
  "mode": "success"
}
```

### Output (example)
```json
{
  "status": "ok",
  "path": "success"
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.CodeOnlyFunctionsIntegrationTest`
- Test Method: `CodeOnlyFunctionsIntegrationTest#functionBehaviourTest`
