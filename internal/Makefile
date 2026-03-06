RAW_VERSION=$(shell cat package.json | grep version | head -1 | cut -d : -f 2 | sed 's/[\",]//g' | tr -d '[[:space:]]')

ifeq ($(RELEASE), true)
FDK_VERSION=$(RAW_VERSION)
else
FDK_VERSION=$(RAW_VERSION).$(BLD_NUMBER)$(BLD_BRANCH_SUFFIX)
endif

.PHONY: set_fdk_version fix_fdk_filename set_image_version setup_code_only_runtime_fdk setup_test_image_build check_image_sizes

set_fdk_version:
	echo "version: \"$(FDK_VERSION)\"" > $(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "fdk_version=$(FDK_VERSION)" >> $(BLD_INPUT_DIR)/exportVariables.env

fix_fdk_filename:
	mv fnproject-fdk-*.tgz fnproject-fdk-$(FDK_VERSION).tgz || true

set_image_version:
	echo "version: \"$(NODE_VERSION)$(if $(OS_VERSION),-$(OS_VERSION),)-$(FDK_VERSION)$(if $(VERSION_SUFFIX),-$(VERSION_SUFFIX),)\"" > $(BLD_INPUT_DIR)/buildOverrideVariables.conf

setup_code_only_runtime_fdk:
	echo "fdkVersion: \"$(FDK_VERSION)\"" >$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	cp "$(BLD_INPUT_DIR)/fnproject-fdk-$(FDK_VERSION).tgz" "$(BLD_INPUT_DIR)/internal/images/code-only-fn-runtime/$(NODE_VERSION)"

setup_test_image_build:
    # Build tag for the test image
	echo "version: \"node-$(NODE_VERSION)-$(FDK_VERSION)\"" >$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "fdkVersion: \"$(FDK_VERSION)\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "buildImageVersion: \"$(NODE_VERSION)-$(FDK_VERSION)-dev\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "runtimeImageVersion: \"$(NODE_VERSION)-$(FDK_VERSION)\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "codeOnlyFnRuntimeImageVersion: \"$(NODE_VERSION)-$(OS_VERSION)-$(FDK_VERSION)-code-only-fn\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	cat $(BLD_INPUT_DIR)/buildOverrideVariables.conf
	find $(BLD_INPUT_DIR)/internal/tests-images -name 'package.json' -exec sh -c 'cp "$(BLD_INPUT_DIR)/fnproject-fdk-$(FDK_VERSION).tgz" "$$(dirname {})"' \;

# Invokes the check_image_sizes.sh script (passing the current FDK_VERSION) to validate that the Build, Runtime, and Code-Only Function runtime images remain within their expected size limits.
check_image_sizes:
	FDK_VERSION=$(FDK_VERSION) \
	./internal/tests-images/check_image_sizes.sh