# os-level-regression-code-only-fn-test
This folder contains a test function used to validate **OS-level runtime regressions and sandboxing**
built on base build image and executed on code-only function runtime image.

---

## Purpose
This test ensures that runtime image updates do not introduce regressions in:
- time/locale/timezone behavior
- presence of core system libraries (e.g., libc) required by common Node workloads
- outbound TLS handshake/certificate validation functionality
- DNS resolution behavior
- basic execution identity information (uid/gid/env)
- filesystem behavior and boundary enforcement (writable `/tmp`, restricted paths remain blocked)

---

## How the function works
The handler runs a set of probes and returns a single JSON document with stable keys:

- **Time/locale/tz**: emits current time, derived locale env, and timezone offset.
- **System libraries & TLS**:
  - checks for libc by verifying common `libc.so.6` locations
  - probes outbound TLS by making an HTTPS request (any HTTP status is OK; handshake must succeed)
- **DNS & TLS**: performs a DNS lookup for the probe host and reuses the TLS probe result.
- **Execution identity**: reports uid/gid where available and selected environment variables.
- **Filesystem checks**:
  - attempts to write a small probe file under `/tmp` (must succeed)
  - attempts to write under restricted paths (must fail), validating sandbox boundaries

---

## Input and Output

### Input
No specific input is required.

### Output (example)
```json
{
  "time_locale_tz": {
    "local_time": "2026-01-01T00:00:00.000Z",
    "utc_time": "2026-01-01T00:00:00.000Z",
    "locale": "en_US.UTF-8",
    "tz_offset": 0
  },
  "syslib_check": {
    "libc": "ok",
    "openssl": "ok"
  },
  "dns_tls_check": {
    "dns": "ok",
    "tls": "ok"
  },
  "fs_encoding": {
    "tmp_write": {
      "path": "/tmp",
      "write": "ok"
    }
  }
}
```

## Test assertion location
- Repository - https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
- Test Class: `com.oracle.oci.functions.common.OsLevelRegressionIntegrationTest`
- Test Method: `OsLevelRegressionIntegrationTest#osLevelRegressionTest`
