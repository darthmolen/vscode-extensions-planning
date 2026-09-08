import * as vscode from 'vscode'

import { groupEntries, openEntries } from './model.ts'
import type { Config, Entry, MalformedEntry } from './model.ts'

/**
 * The keyboard path.
 *
 * createQuickPick rather than showQuickPick: item buttons render only on the
 * former, and onDidTriggerItemButton leaves the pick open, so several reminders
 * can be dealt with in one pass.
 */

interface Item extends vscode.QuickPickItem {
  readonly entry?: Entry
  readonly malformedPath?: string
}

const OPEN_PLAN: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('link-external'),
  tooltip: 'Open the plan this reminder came from',
}

const CLOSE: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('check'),
  tooltip: 'Close this reminder',
}

function buildItems(
  entries: readonly Entry[],
  malformed: readonly MalformedEntry[],
  config: Config,
): Item[] {
  const items: Item[] = []

  for (const group of groupEntries(openEntries(entries, config), config)) {
    if (group.label !== '') {
      items.push({ label: group.label, kind: vscode.QuickPickItemKind.Separator })
    }
    for (const entry of group.entries) {
      const { reminder } = entry
      const bits = [reminder.audience, reminder.raised].filter(
        (s): s is string => s !== undefined && s !== '',
      )
      items.push({
        label: reminder.title,
        description: bits.join(' · '),
        detail: reminder.summary,
        buttons: reminder.plan === undefined ? [CLOSE] : [OPEN_PLAN, CLOSE],
        entry,
      })
    }
  }

  if (malformed.length > 0) {
    items.push({ label: 'did not parse', kind: vscode.QuickPickItemKind.Separator })
    for (const m of malformed) {
      // The one place a filename belongs: it is the only useful thing to say
      // about a file that did not parse.
      items.push({
        label: '$(warning) ' + m.path,
        detail: m.malformed.reason,
        malformedPath: m.path,
      })
    }
  }

  return items
}

export interface QuickPickActions {
  open(entry: Entry): void
  openMalformed(path: string): void
  openPlan(entry: Entry): void
  close(entry: Entry): void
}

export function showReminderQuickPick(
  entries: readonly Entry[],
  malformed: readonly MalformedEntry[],
  config: Config,
  actions: QuickPickActions,
): void {
  const items = buildItems(entries, malformed, config)

  if (items.length === 0) {
    void vscode.window.showInformationMessage('No open reminders.')
    return
  }

  const pick = vscode.window.createQuickPick<Item>()
  pick.items = items
  pick.title = 'Reminders'
  pick.placeholder = 'Search open reminders'
  pick.matchOnDescription = true
  pick.matchOnDetail = true

  pick.onDidTriggerItemButton((event) => {
    const entry = event.item.entry
    if (entry === undefined) return
    if (event.button === OPEN_PLAN) actions.openPlan(entry)
    else if (event.button === CLOSE) actions.close(entry)
  })

  pick.onDidAccept(() => {
    const chosen = pick.selectedItems[0]
    if (chosen === undefined) return
    if (chosen.entry !== undefined) actions.open(chosen.entry)
    else if (chosen.malformedPath !== undefined) actions.openMalformed(chosen.malformedPath)
    pick.hide()
  })

  pick.onDidHide(() => pick.dispose())
  pick.show()
}
