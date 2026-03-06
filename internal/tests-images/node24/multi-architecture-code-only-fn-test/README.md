# multi-architecture-code-only-fn-test
This folder contains a test function used to validate **multi-architecture runtime behavior**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- the correct architecture-specific image is selected at runtime
- multi-arch manifests resolve to the expected execution environment
- functions behave consistently across x86 and ARM runtimes

---

## How the function works
- The function uses Node’s `os.arch()` to determine the current CPU architecture.
- It returns a normalized identifier using `fdk.rawResult()`:
  - `X86` for `x64` / `amd64`
  - `ARM` for `arm64` / `aarch64`
  - otherwise, the raw architecture string
- This allows integration test to validate the architecture returned by the function execution with that of the architecture of the application
---

## Input and Output

### Input
No specific input is required.

### Output (example)
```text
X86
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.CodeOnlyFunctionsIntegrationTest`
- Test Method: `CodeOnlyFunctionsIntegrationTest#multiArchitectureTest`
