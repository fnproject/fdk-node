# runtime-version-test
This folder contains a test function used to validate **Node.js version reporting**
built on the **base build and runtime image**.
---

## Purpose
This test ensures that:
- `process.version` is available and matches the Node runtime in the image
- returning a raw (non-JSON) response works as expected

---

## How the function works
- The function reads `process.version` (for example `v24.0.0`).
- It strips the leading `v` and returns a raw string via `fdk.rawResult()` in the form:
  - `node<full_version>` (example: `node24.0.0`)

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```text
node24.0.0
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.RuntimeVersionIntegrationTest`
- Test Method: `RuntimeVersionIntegrationTest#runtimeVersionTest`
