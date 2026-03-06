# runtime-specific-code-only-fn-test
This folder contains a test function used to validate **Node 24 runtime-specific behavior**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- the function is executing on the expected Node.js major version (`24`)
- the WebSocket global is present (`globalThis.WebSocket`)
- ABI / native-module compatibility identifiers look sane for Node 24 (`process.versions.modules >= 128`)
- the ABI differs from the Node 22 ABI line (Node 22 uses modules ABI `127`)

---

## How the function works
- The function derives the Node major version from `process.versions.node` and fails if it is not `24`.
- It checks `globalThis.WebSocket` and records `present/absent`.
- It reads `process.versions.modules` (Node “modules ABI”) and asserts:
  - it is a number >= 128 (basic sanity)
  - it is not equal to `127` (must differ from Node 22)
- It returns HTTP `200` if all checks pass, otherwise HTTP `500`, with a JSON body containing details.

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```json
{
  "runtime": "node24",
  "fetch_present": "ok",
  "websocket_global": "present",
  "node24_abi_check": "ok",
  "modules_abi": 137,
  "status": "ok"
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.node.Node24RuntimeSpecificIntegrationTest`
- Test Method: `Node24RuntimeSpecificIntegrationTest#runtimeSpecificTest`
