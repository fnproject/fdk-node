# timeout-test
This folder contains a test function built on the **base build image** and executed on the
**base runtime image**.

---

## Purpose
This test ensures that:
- function invocation timeouts are enforced correctly by the platform
- timeout behavior remains consistent across runtime/FDK updates
- the control plane / data plane surface the expected timeout failure mode
- async/await usage does not affect timeout enforcement

---

## How the function works
- The handler sleeps for ~6 seconds using a Promise-based `sleep(ms)` helper.
- After the sleep, it returns a raw string response (`Timed out`) via `fdk.rawResult()`.
- In integration tests, the timeout value is configured such that the invocation should time out
  before the handler completes (or, depending on configuration, to validate the boundary).

---

## Input and Output

### Input
No specific input is required.

### Output
- No successful output is expected.
- The invocation should fail with a **timeout** (504 http error code), and the integration test asserts:
  - HTTP status / service code used for timeout failures

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.FunctionsIntegrationTest`
- Test Method: `FunctionsIntegrationTest#timeoutTest`
