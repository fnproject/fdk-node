const nodeGypBuild = require('node-gyp-build')

// Automatically loads:
// prebuilds/linux-x64/my_native_addon.node
// OR
// prebuilds/linux-arm64/my_native_addon.node
module.exports = nodeGypBuild(__dirname)
