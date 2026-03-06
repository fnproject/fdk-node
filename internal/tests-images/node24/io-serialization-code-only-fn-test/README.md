# io-serialization-code-only-fn-test
This folder contains a test function used to validate **request/response I/O and serialization**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- JSON, text, and binary inputs are handled correctly
- Content-Type headers are propagated as expected
- response serialization remains stable across runtime updates

---

## How the function works
- The function attempts to normalize the request body into:
  - `raw`: a `Buffer` containing the original request bytes (when possible)
  - `payload`: a parsed JSON object (or `{}` if parsing fails)
- It reads `payload.mode` to decide the response path:
  - `text` → returns a plain text response and sets `Content-Type: text/plain`
  - `binary` → returns JSON containing `binary_length` of the raw request bytes
  - default (`json`) → returns a JSON response echoing the parsed payload
- Invalid JSON is treated as `{}` and `raw` is treated as empty.

---

## Input and Output

### Input: text mode (example)
```json
{
  "mode": "text"
}
```

### Output: text mode (example)
```text
plain-text-response
```

### Input: binary mode (example)
```json
{
  "mode": "binary"
}
```

### Output: binary mode (example)
```json
{
  "binary_length": 17
}
```

### Input: default JSON mode (example)
```json
{
  "k": "v"
}
```

### Output: default JSON mode (example)
```json
{
  "message": "json-response",
  "payload": {
    "k": "v"
  }
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.CodeOnlyFunctionsIntegrationTest`
- Test Method: `CodeOnlyFunctionsIntegrationTest#ioSerializationTest`
