import * as vscode from 'vscode'

import type { Config, Entry, MalformedEntry } from './model.ts'
import { isReminder, parseReminder } from './parse.ts'
import { safeDirectory } from './plan.ts'

const DEFAULT_DIRECTORY = 'planning/reminders'

/**
 * Reads the reminders directory and keeps reading it.
 *
 * The one job that needs the filesystem. Everything it produces is handed to the
 * pure model; nothing here decides what "open" means or how anything groups.
 */
export class ReminderStore implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<void>()
  private readonly log: vscode.LogOutputChannel
  private watcher: vscode.FileSystemWatcher | undefined
  private timer: NodeJS.Timeout | undefined
  private folder: vscode.WorkspaceFolder | undefined
  private warnedMultiRoot = false

  entries: Entry[] = []
  malformed: MalformedEntry[] = []

  /** Fires after the directory has been re-read, debounced. */
  readonly onDidChange = this.emitter.event

  constructor() {
    // An activation or scan failure is otherwise invisible: the item hides at
    // zero, so "nothing outstanding" and "it threw" look identical.
    this.log = vscode.window.createOutputChannel('Reminders', { log: true })
  }

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.watcher?.dispose()
    this.emitter.dispose()
    this.log.dispose()
  }

  /** Rebuilds the watcher for the configured directory and re-reads it. */
  async start(): Promise<void> {
    this.watcher?.dispose()
    this.watcher = undefined

    const folders = vscode.workspace.workspaceFolders ?? []
    this.folder = folders[0]

    if (this.folder === undefined) {
      this.entries = []
      this.malformed = []
      this.emitter.fire()
      return
    }

    if (folders.length > 1 && !this.warnedMultiRoot) {
      // Say which folder rather than silently choosing one. Refusing outright
      // would leave multi-root users with an extension that does nothing, which
      // is worse than doing something predictable and stated.
      this.warnedMultiRoot = true
      this.log.warn(
        `Multi-root workspace: reading reminders from "${this.folder.name}" only. ` +
          'The other folders are ignored in this version.',
      )
      void vscode.window.showWarningMessage(
        `Reminders: multi-root workspace — reading "${this.folder.name}" only.`,
      )
    }

    try {
      this.watcher = vscode.workspace.createFileSystemWatcher(this.pattern())
      this.watcher.onDidCreate(() => this.scheduleRefresh())
      this.watcher.onDidChange(() => this.scheduleRefresh())
      this.watcher.onDidDelete(() => this.scheduleRefresh())
    } catch (error) {
      this.log.error(`Could not watch the reminders directory: ${String(error)}`)
    }

    await this.refresh()
  }

  /**
   * `reminders.directory` is workspace-root-relative in v1, and it is a setting
   * a person types, so it is sanitised rather than trusted: an empty value or
   * one containing `..` falls back instead of pointing the watcher outside the
   * workspace.
   */
  private pattern(): vscode.RelativePattern {
    const folder = this.folder
    if (folder === undefined) throw new Error('no workspace folder')

    const configured = section().get<string>('directory', DEFAULT_DIRECTORY)
    const directory = safeDirectory(configured, DEFAULT_DIRECTORY)
    if (directory !== configured.trim()) {
      this.log.warn(
        `reminders.directory "${configured}" is not a usable workspace-relative ` +
          `path; using "${directory}".`,
      )
    }

    return new vscode.RelativePattern(folder, `${directory}/*.md`)
  }

  /** Windows fires twice for a single write, so coalesce before re-reading. */
  private scheduleRefresh(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = undefined
      // A rejection here would be unhandled in the extension host. Log it and
      // keep running rather than taking the host down with us.
      this.refresh().catch((error: unknown) => {
        this.log.error(`Refresh failed: ${String(error)}`)
      })
    }, 150)
  }

  async refresh(): Promise<void> {
    if (this.folder === undefined) return

    let found: vscode.Uri[]
    try {
      found = await vscode.workspace.findFiles(this.pattern())
    } catch (error) {
      // Fail visibly and keep the previous list, rather than silently emptying.
      this.log.error(`Could not list the reminders directory: ${String(error)}`)
      void vscode.window.showErrorMessage(
        'Reminders: could not read the reminders directory. See the Reminders output channel.',
      )
      return
    }

    const entries: Entry[] = []
    const malformed: MalformedEntry[] = []

    for (const uri of [...found].sort((a, b) => a.path.localeCompare(b.path))) {
      const path = vscode.workspace.asRelativePath(uri, false)
      let text: string
      try {
        text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8')
      } catch (error) {
        malformed.push({ path, malformed: { reason: `could not be read: ${String(error)}` } })
        continue
      }

      const result = parseReminder(text)
      if (isReminder(result)) entries.push({ path, reminder: result })
      else malformed.push({ path, malformed: result })
    }

    this.entries = entries
    this.malformed = malformed
    this.emitter.fire()
  }
}

const section = (): vscode.WorkspaceConfiguration => vscode.workspace.getConfiguration('reminders')

export function readConfig(): Config {
  const c = section()
  return {
    openStatus: c.get<string>('openStatus', 'open'),
    warnOnAudience: c.get<string[]>('warnOnAudience', ['learner']),
    groupBy: c.get<Config['groupBy']>('groupBy', 'subject'),
    closedLabel: c.get<string>('closedLabel', 'Closed'),
  }
}

export const statusBarPriority = (): number => section().get<number>('statusBarPriority', 49)
