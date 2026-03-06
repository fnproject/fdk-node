# oci-sdk-test
This folder contains a test function used to validate **OCI Node SDK usage**
built on base build and runtime image.

---

## Purpose
This test ensures that:
- OCI Node SDK dependencies (`oci-identity`, `oci-common`) can be loaded in the runtime image
- Resource Principal authentication works in the function environment
- basic outbound SDK calls (Identity `GetCompartment`) succeed or fail deterministically

---

## How the function works
- The function expects a JSON payload containing a `compartmentId`.
- It constructs a Resource Principal auth provider.
- It builds an OCI Identity client and calls `getCompartment({ compartmentId })`.
- It returns the compartment OCID on success, otherwise a stable error string.

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

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.FunctionsIntegrationTest`
- Test Method: `FunctionsIntegrationTest#ociSdkTest`
