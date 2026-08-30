import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * The manifest and the code are two halves of one wiring, and nothing else
 * checks that they agree. A command declared and never registered shows up in
 * the palette and throws when picked; a command registered and never declared is
 * unreachable. Neither is visible to a unit test of either file alone.
 */

const ROOT = join(import.meta.dirname, '..')
const read = (p: string): string => readFileSync(join(ROOT, p), 'utf8')

const manifest = JSON.parse(read('package.json')) as {
  engines: { vscode: string }
  main: string
  activationEvents: string[]
  contributes: {
    commands: { command: string; title: string }[]
    configuration: { properties: Record<string, { default?: unknown }> }
  }
}

const extensionSrc = read('src/extension.ts')
const storeSrc = read('src/store.ts')

const declaredCommands = manifest.contributes.commands.map((c) => c.command)
const registeredCommands = [...extensionSrc.matchAll(/registerCommand\(\s*([A-Z_]+)/g)].map(
  (m) => {
    const constName = m[1] ?? ''
    const decl = new RegExp(`const ${constName} = '([^']+)'`).exec(extensionSrc)
    return decl?.[1] ?? `<unresolved ${constName}>`
  },
)

describe('the manifest and the code agree', () => {
  test('every declared command is registered', () => {
    expect(registeredCommands.length).toBeGreaterThan(0) // control
    expect([...declaredCommands].sort()).toEqual([...registeredCommands].sort())
  })

  test('every command id resolves to a literal, not an unread constant', () => {
    expect(registeredCommands.filter((c) => c.startsWith('<unresolved'))).toEqual([])
  })

  test('every setting read by the code is declared in the manifest', () => {
    const declared = Object.keys(manifest.contributes.configuration.properties)
    const read = [...storeSrc.matchAll(/get<[^>]+>\(\s*'([a-zA-Z]+)'/g)].map(
      (m) => `reminders.${m[1] ?? ''}`,
    )
    // plus the directory lookup, which has its own helper
    read.push('reminders.directory')

    expect(read.length).toBeGreaterThan(1) // control
    for (const key of new Set(read)) expect(declared).toContain(key)
  })

  test('the engines floor is at least 1.80, where checkboxState was finalized', () => {
    const [, major, minor] = /\^?(\d+)\.(\d+)\./.exec(manifest.engines.vscode) ?? []
    expect(Number(major)).toBe(1)
    expect(Number(minor)).toBeGreaterThanOrEqual(80)
  })

  test('main points at the bundle esbuild actually writes', () => {
    expect(manifest.main).toBe('./dist/extension.js')
    expect(read('esbuild.js')).toContain("outfile: 'dist/extension.js'")
  })

  test('the extension activates without waiting to be asked', () => {
    expect(manifest.activationEvents).toContain('onStartupFinished')
  })

  test('the status bar priority default is 49, right of Problems at 50', () => {
    expect(
      manifest.contributes.configuration.properties['reminders.statusBarPriority']?.default,
    ).toBe(49)
  })
})
