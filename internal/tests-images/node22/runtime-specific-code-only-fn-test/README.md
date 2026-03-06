# runtime-specific-code-only-fn-test
This folder contains a test function used to validate **Node 22 runtime-specific behavior**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- the function is executing on the expected Node.js major version (`22`)
- shared runtime features (e.g., global `fetch`) are available
- ABI / native-module compatibility identifiers match the Node 22 line (`process.versions.modules == "127"`)
- Node 24-specific ABI identifiers are not present when running on Node 22

---

## How the function works
- The function derives the Node major version from `process.versions.node` and fails if it is not `22`.
- It checks for expected global feature availability (`fetch`). 
- It returns a JSON object including:
  - `modules_abi`, `napi`, and `v8` version strings
  - a strict ABI check for Node 22 (`modules_abi == "127"`)
- It returns HTTP `200` with `status: "ok"` if all checks pass, otherwise `500` with details.

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```json
{
  "runtime": "node22",
  "fetch_present": "ok",
  "modules_abi": "127",
  "napi": "9",
  "v8": "12.4.254.21-node.11",
  "node24_abi_feature": "absent",
  "node22_abi_check": "ok",
  "status": "ok"
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.node.Node22RuntimeSpecificIntegrationTest`
- Test Method: `Node22RuntimeSpecficIntegrationTest#runtimeSpecificTest`
