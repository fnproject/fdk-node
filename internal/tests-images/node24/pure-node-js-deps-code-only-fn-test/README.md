# pure-node-js-deps-code-only-fn-test
This folder contains a test function used to validate **pure Node.js dependency compatibility**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- common "pure JS" npm dependencies can be required/initialized successfully on the runtime image
- dependency behavior remains compatible after Node/OS image updates
- dependency versions are readable at runtime for integration test assertions
- pinned and unpinned dependency resolution behaves as expected. FDK pinned by customer takes precedence over prebaked FDK in code only fn runtime image.

---

## How the function works
- The handler attempts to `require()` and perform a minimal "smoke" operation for a set of
  popular libraries (no external network calls required).
- For each library it records:
  - `libs.<name>`: `ok` or a stable `failed:<ErrorName>:<message>` string
  - `versions.<name>`: the library version read from its `package.json`
- It returns a combined JSON object that can be asserted on by integration tests.

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```json
{
  "message": "node_pure_deps_and_versions",
  "libs": {
    "express": "ok",
    "axios": "ok",
    "uuid": "ok"
  },
  "versions": {
    "express": "4.x.x",
    "axios": "1.x.x",
    "uuid": "9.x.x"
  }
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.node.NodeCodeOnlyFunctionsIntegrationTest`
- Test Method: `NodeCodeOnlyFunctionsIntegrationTest#pureNodeDepsAndVersionsTest`
