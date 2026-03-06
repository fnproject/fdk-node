# backward-compatibility-code-only-fn-test
This folder contains a test function used to validate **backward compatibility**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- functions with non-FDK dependencies (OCI Node SDK) keep working across runtime updates
- Resource Principal auth continues to function inside the runtime image
- response format and headers remain stable across FDK/runtime changes

---

## How the function works53rd4ewq2
- The function expects a JSON payload containing a `compartmentId`.
- It uses Resource Principals to construct an OCI Identity client.
- It calls `GetCompartment` and returns the resolved compartment OCID.
- It also sets a custom response header (`X-Custom-Header`) to validate protocol/header
  handling across updates.

---

## Input and Output

### Input (example)
```json
{
  "compartmentId": "ocid1.compartment.oc1..exampleuniqueID"
}
```

### Output (example)
```json
{
  "compartmentId": "ocid1.compartment.oc1..exampleuniqueID"
}
```
#### Headers
```
Content-Type: application/json
Fn-Fdk-Runtime: node/22.22.0
Fn-Fdk-Version: fdk-node/0.0.88
X-Custom-Header: CustomHeaderValue
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.node.NodeCodeOnlyFunctionsIntegrationTest`
- Test Method: `NodeCodeOnlyFunctionsIntegrationTest#backwardCompatibilityTest`
