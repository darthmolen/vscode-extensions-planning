const esbuild = require('esbuild')

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/**
 * The extension host is CommonJS on node, and `vscode` is supplied by the host
 * rather than bundled. That is why this package sits outside the pyquest npm
 * workspaces, whose root is ESM on NodeNext — the two cannot share a config.
 */
async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    target: 'node20',
    external: ['vscode'],
    outfile: 'dist/extension.js',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    logLevel: 'info',
  })

  if (watch) {
    await ctx.watch()
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
