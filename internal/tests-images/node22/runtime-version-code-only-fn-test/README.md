# runtime-version-code-only-fn-test
This folder contains a test function used to validate **runtime version identification**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that:
- the runtime reports a stable language runtime identifier derived from Node major version
- the base OS distribution can be detected consistently from `/etc/os-release`
- the combined runtime string remains stable across image updates

---

## How the function works
- The function reads `/etc/os-release` to determine the OS distribution:
  - `ol9` for Oracle Linux 9 (normalized)
  - otherwise a lowercase distro name
  - `unknown_os` if parsing fails
- It derives the Node runtime identifier from `process.versions.node` (major only), e.g. `node22`.
- It returns a combined string via `fdk.rawResult()` in the format:
  - `node<major>.<os>` (example: `node22.ol9`)

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```text
node22.ol9
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.CodeOnlyFunctionsIntegrationTest`
- Test Method: `CodeOnlyFunctionsIntegrationTest#runtimeVersionCodeOnlyTest`
