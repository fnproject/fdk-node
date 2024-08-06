RAW_VERSION=$(shell cat package.json | grep version | head -1 | cut -d : -f 2 | sed 's/[\",]//g' | tr -d '[[:space:]]')
FDK_VERSION=$(RAW_VERSION)$(if $(BLD_BRANCH_SUFFIX),.$(BLD_NUMBER)$(BLD_BRANCH_SUFFIX),)

.PHONY: set_fdk_version fix_fdk_filename set_image_version setup_test_image_build

set_fdk_version:
	echo "version: \"$(FDK_VERSION)\"" > $(BLD_INPUT_DIR)/buildOverrideVariables.conf

fix_fdk_filename:
	mv fnproject-fdk-*.tgz fnproject-fdk-$(FDK_VERSION).tgz

set_image_version:
	echo "version: \"$(NODE_VERSION)-$(FDK_VERSION)$(if $(VERSION_SUFFIX),-$(VERSION_SUFFIX),)\"" > $(BLD_INPUT_DIR)/buildOverrideVariables.conf

setup_test_image_build:
    # Build tag for the test image
	echo "version: \"ruby-$(NODE_VERSION)-$(FDK_VERSION)\"" >$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "fdkVersion: \"$(FDK_VERSION)\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "buildImageVersion: \"$(NODE_VERSION)-$(FDK_VERSION)-dev\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	echo "runtimeImageVersion: \"$(NODE_VERSION)-$(FDK_VERSION)\"" >>$(BLD_INPUT_DIR)/buildOverrideVariables.conf
	cat $(BLD_INPUT_DIR)/buildOverrideVariables.conf
	find $(BLD_INPUT_DIR)/internal/tests-images -name 'package.json' -exec sh -c 'cp "$(BLD_INPUT_DIR)/fnproject-fdk-$(FDK_VERSION).tgz" "$$(dirname {})"' \;