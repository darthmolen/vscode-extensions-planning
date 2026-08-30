import * as vscode from 'vscode'

import { closeWithPrompt } from './close.ts'
import type { Entry } from './model.ts'
import { choosePlanPath, planPattern } from './plan.ts'
import { showReminderQuickPick } from './quickPick.ts'
import { StatusBar } from './statusBar.ts'
import { ReminderStore, readConfig, statusBarPriority } from './store.ts'
import { ReminderTree } from './tree.ts'
import type { Node } from './tree.ts'

const REFRESH = 'reminders.refresh'
const SHOW = 'reminders.show'
const OPEN_REMINDER = 'reminders.openReminder'
const OPEN_MALFORMED = 'reminders.openMalformed'
const OPEN_PLAN = 'reminders.openPlan'
const CLOSE = 'reminders.close'
const DROP = 'reminders.drop'

export function activate(context: vscode.ExtensionContext): void {
  const store = new ReminderStore()
  const statusBar = new StatusBar(statusBarPriority(), SHOW)
  const tree = new ReminderTree(readConfig())
  const view = vscode.window.createTreeView<Node>('reminders.view', {
    treeDataProvider: tree,
    showCollapseAll: true,
  })

  const uriOf = (path: string): vscode.Uri | undefined => {
    const folder = vscode.workspace.workspaceFolders?.[0]
    return folder === undefined ? undefined : vscode.Uri.joinPath(folder.uri, path)
  }

  const openPath = async (path: string): Promise<void> => {
    const uri = uriOf(path)
    if (uri === undefined) return
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri))
  }

  const openPlanFor = async (entry: Entry): Promise<void> => {
    const folder = vscode.workspace.workspaceFolders?.[0]
    const pattern = planPattern(entry.reminder.plan)
    if (folder === undefined || pattern === undefined) {
      void vscode.window.showInformationMessage('That reminder names no plan.')
      return
    }

    const found = await vscode.workspace.findFiles(
      new vscode.RelativePattern(folder, pattern),
    )
    const chosen = choosePlanPath(
      found.map((uri) => vscode.workspace.asRelativePath(uri, false)),
    )

    if (chosen === undefined) {
      // The glob is meant to survive a plan moving. If nothing matches, the plan
      // is genuinely gone, and saying so beats opening the wrong file.
      void vscode.window.showWarningMessage('No plan matches ' + pattern)
      return
    }
    await openPath(chosen)
  }

  const closeEntry = async (entry: Entry, status: 'done' | 'dropped'): Promise<void> => {
    const uri = uriOf(entry.path)
    if (uri === undefined) return
    if (await closeWithPrompt(entry, status, readConfig(), uri)) await store.refresh()
  }

  const render = (): void => {
    const config = readConfig()
    statusBar.render(store.entries, store.malformed, config)
    tree.update(store.entries, store.malformed, config)
    const count = tree.openCount()
    view.badge = count === 0 ? undefined : { value: count, tooltip: count + ' open reminders' }
  }

  const entryFor = (node: Node | undefined): Entry | undefined =>
    node !== undefined && node.kind === 'reminder' ? node.entry : undefined

  context.subscriptions.push(
    store,
    statusBar,
    view,
    store.onDidChange(render),

    vscode.commands.registerCommand(REFRESH, () => store.refresh()),
    vscode.commands.registerCommand(OPEN_REMINDER, (path: string) => openPath(path)),
    vscode.commands.registerCommand(OPEN_MALFORMED, (path: string) => openPath(path)),

    vscode.commands.registerCommand(OPEN_PLAN, (node?: Node) => {
      const entry = entryFor(node)
      if (entry !== undefined) void openPlanFor(entry)
    }),
    vscode.commands.registerCommand(CLOSE, (node?: Node) => {
      const entry = entryFor(node)
      if (entry !== undefined) void closeEntry(entry, 'done')
    }),
    vscode.commands.registerCommand(DROP, (node?: Node) => {
      const entry = entryFor(node)
      if (entry !== undefined) void closeEntry(entry, 'dropped')
    }),

    vscode.commands.registerCommand(SHOW, () => {
      showReminderQuickPick(store.entries, store.malformed, readConfig(), {
        open: (entry) => void openPath(entry.path),
        openMalformed: (path) => void openPath(path),
        openPlan: (entry) => void openPlanFor(entry),
        close: (entry) => void closeEntry(entry, 'done'),
      })
    }),

    // Ticking the box is the close gesture. It prompts; cancelling leaves the
    // file untouched, so the box has to go back to how it was.
    view.onDidChangeCheckboxState((event) => {
      void (async () => {
        for (const [node] of event.items) {
          const entry = entryFor(node)
          if (entry !== undefined) await closeEntry(entry, 'done')
        }
        render()
      })()
    }),

    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('reminders.directory')) void store.start()
      else if (e.affectsConfiguration('reminders')) render()
    }),

    vscode.workspace.onDidChangeWorkspaceFolders(() => void store.start()),
  )

  void store.start()
}

export function deactivate(): void {
  // Everything is in context.subscriptions.
}
