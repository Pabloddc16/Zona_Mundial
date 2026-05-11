const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the whole monorepo for changes
config.watchFolders = [workspaceRoot]

// Resolve modules from both the project and the workspace root (pnpm hoisting)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// Force Metro to follow symlinks so it can resolve pnpm's symlinked deps
config.resolver.unstable_enableSymlinks = true
config.resolver.disableHierarchicalLookup = false

module.exports = config