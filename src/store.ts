import * as vscode from 'vscode'

import type { Config, Entry, MalformedEntry } from './model.ts'
import { isReminder, parseReminder } from './parse.ts'

/**
 * Reads the reminders directory and keeps reading it.
 *
 * The one job that needs the filesystem. Everything it produces is handed to the
 * pure model; nothing here decides what "open" means or how anything groups.
 */
export class ReminderStore implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<void>()
  private watcher: vscode.FileSystemWatcher | undefined
  private timer: NodeJS.Timeout | undefined
  private folder: vscode.WorkspaceFolder | undefined

  entries: Entry[] = []
  malformed: MalformedEntry[] = []

  /** Fires after the directory has been re-read, debounced. */
  readonly onDidChange = this.emitter.event

  dispose(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.watcher?.dispose()
    this.emitter.dispose()
  }

  /** Rebuilds the watcher for the configured directory and re-reads it. */
  async start(): Promise<void> {
    this.watcher?.dispose()
    this.folder = vscode.workspace.workspaceFolders?.[0]
    if (this.folder === undefined) {
      this.entries = []
      this.malformed = []
      this.emitter.fire()
      return
    }

    // `reminders.directory` is workspace-root-relative in v1. That constraint is
    // what lets a WorkspaceFolder be the pattern base; an absolute path would
    // need Uri.file() instead, and supporting both half-way is worse than one.
    const pattern = new vscode.RelativePattern(this.folder, `${directory()}/*.md`)
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern)
    this.watcher.onDidCreate(() => this.scheduleRefresh())
    this.watcher.onDidChange(() => this.scheduleRefresh())
    this.watcher.onDidDelete(() => this.scheduleRefresh())

    await this.refresh()
  }

  /** Windows fires twice for a single write, so coalesce before re-reading. */
  private scheduleRefresh(): void {
    if (this.timer !== undefined) clearTimeout(this.timer)
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.refresh()
    }, 150)
  }

  async refresh(): Promise<void> {
    const folder = this.folder
    if (folder === undefined) return

    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, `${directory()}/*.md`),
    )

    const entries: Entry[] = []
    const malformed: MalformedEntry[] = []

    for (const uri of found.sort((a, b) => a.path.localeCompare(b.path))) {
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

const directory = (): string => section().get<string>('directory', 'planning/reminders')

export function readConfig(): Config {
  const c = section()
  return {
    openStatus: c.get<string>('openStatus', 'open'),
    warnOnAudience: c.get<string[]>('warnOnAudience', ['learner']),
    groupBy: c.get<Config['groupBy']>('groupBy', 'subject'),
    closedLabel: c.get<string>('closedLabel', 'Closed'),
  }
}

export const statusBarPriority = (): number =>
  section().get<number>('statusBarPriority', 49)
