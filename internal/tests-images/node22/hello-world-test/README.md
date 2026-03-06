# hello-world-test
This folder contains a test function used to validate a **basic Node.js hello-world**
handler built on base build and runtime images.

---

## Purpose
This test ensures that:
- the Node.js function runtime can load and invoke a simple handler successfully
- basic JSON input parsing works as expected
- returning a JavaScript object is serialized to JSON correctly

---

## How the function works
- The function reads a JSON payload and looks for a `name` field.
- If `name` is missing, it defaults to `World`.
- It returns a JSON object: `{ "message": "Hello <name>" }`.

---

## Input and Output

### Input (example)
```json
{
  "name": "Alice"
}
```

### Output (example)
```json
{
  "message": "Hello Alice"
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.FunctionsIntegrationTest`
- Test Method: `FunctionsIntegrationTest#whenCreateFunctionThenSuccess`
