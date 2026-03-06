# native-addon-code-only-fn-test
This folder contains a test function used to validate **native addon loading and execution**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- Node native addons can be packaged and loaded successfully in the code-only runtime image
- `node-gyp-build`-based prebuild selection works on supported architectures
- the runtime can execute compiled addon code (smoke test via a simple `add(1,2)` call)
- addon version metadata can be read at runtime for CI assertions

---

## How the function works
- The function loads a custom dependency `customer-native-addon`, which uses `node-gyp-build`
  to automatically select the correct `.node` binary from `prebuilds/` for the current platform.
- It calls `addon.add(1, 2)` and expects the result to be `3`.
- It returns a JSON payload containing:
  - `libs.customer_native_addon`: `ok` or a stable `failed:<ErrorName>:<message>` string
  - `versions.customer_native_addon`: the dependency version (if readable)

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```json
{
  "message": "node_native_addons_and_custom_prebuilds",
  "libs": {
    "customer_native_addon": "ok"
  },
  "versions": {
    "customer_native_addon": "3.0.0"
  }
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.node.NodeCodeOnlyFunctionsIntegrationTest`
- Test Method: `NodeCodeOnlyFunctionsIntegrationTest#nodeNativeAddonsPinnedVersionTest`
