import * as vscode from 'vscode'

import { openEntries } from './model.ts'
import { StatusBar } from './statusBar.ts'
import { ReminderStore, readConfig, statusBarPriority } from './store.ts'

const REFRESH = 'reminders.refresh'
const SHOW = 'reminders.show'

export function activate(context: vscode.ExtensionContext): void {
  const store = new ReminderStore()
  const statusBar = new StatusBar(statusBarPriority(), SHOW)

  const render = (): void => {
    statusBar.render(store.entries, store.malformed, readConfig())
  }

  context.subscriptions.push(
    store,
    statusBar,
    store.onDidChange(render),

    vscode.commands.registerCommand(REFRESH, () => store.refresh()),

    // Phase 3 replaces this with the QuickPick. Until then it is a placeholder
    // that proves the click path is wired, and says so rather than pretending.
    vscode.commands.registerCommand(SHOW, () => {
      const config = readConfig()
      const open = openEntries(store.entries, config)
      void vscode.window.showInformationMessage(
        `${open.length} open reminder${open.length === 1 ? '' : 's'}, ` +
          `${store.malformed.length} unparsed. The list arrives in Phase 3.`,
      )
    }),

    // A directory change means a different watcher, not just a re-render.
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
