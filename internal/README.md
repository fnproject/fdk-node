# Internal folder in Node FDK
The internal folder for Node FDK contains scripts for building base build, runtime and code only fn runtime images, and the FDK npm package.
It also contains scripts to release artifacts as part of the FDK release pipeline and includes test function image folders used by the
[FDK integration tests suite](https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse).

## Overview of the directory structure of the internal folder

### images
- Contains Dockerfiles to build the following: 
  - `build-stage/` - Builds base build image(s) for different Node runtimes.
  - `runtime/` - Builds base runtime image(s) for different Node runtimes.
  - `code-only-fn-runtime/` - Builds base code-only function runtime image(s) (FDK baked in).
- The folder structure is runtime-version specific (e.g. `22/`, `24/`).

### release
- Contains release scripts, including:
  - `docker_publish.sh` - Publishes the build and runtime images.
  - `github_publish.sh` - Publishes the FDK code to public GitHub repo https://github.com/fnproject/fdk-node
  - `setup_release_version.sh` - Updates version(s) and creates git tag(s) as part of release.
  - `update_version_fdk_npm_pkg.sh` - Updates the FDK npm package version metadata.

### Makefile
- Contains important steps invoked from ocibuild.conf build and publish steps -
  - build the FDK npm package
  - set versions and docker build args required to build/publish build, runtime and code-only runtime images
  - build/publish test function images used by the integration test suite

### tests-images
- Contains source code for test functions across different Node runtime versions.
- The folder structure is organized by runtime version, for example:
  - `node22/`
  - `node24/`
- Each test function folder typically contains:
  - `Build_file.bs` (Docker build spec)
  - function source code (e.g. `func.js`)
  - optional `package.json` for dependency-based tests

#### How these tests work (end-to-end)

1. **Function image build**
   - Each test folder contains a `Build_file.bs` and function source code.
   - The test function image is built either on top of the base build/runtime images (to simulate container-image based functions)
     or on top of the code-only runtime image (to simulate code-only function images).

2. **Image publication**
   - As part of the `ocibuild.conf` build and publish steps:
     - test function images are built
     - images are published to Artifactory

3. **Image copy to OCIR**
   - The published test images are copied to OCIR as part of `test_spec.yaml` pipeline steps.

4. **FDK integration testing**
   - The **FDK integration test suite**
     https://bitbucket.oci.oraclecorp.com/projects/FAAS/repos/fdk-integration-tests/browse
   - Uses the test function image paths from OCIR to:
     - create OCI Functions
     - invoke the functions
     - validate:
       - function creation status
       - invoke HTTP status codes
       - response body
       - headers