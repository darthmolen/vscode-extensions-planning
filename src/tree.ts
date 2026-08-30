import * as vscode from 'vscode'

import { groupEntries, openEntries } from './model.ts'
import type { Config, Entry, Group, MalformedEntry } from './model.ts'

/**
 * The persistent surface: a Reminders tab in the Panel, beside Problems and
 * Terminal, which is the placement the whole idea is reaching for.
 *
 * TreeItem.resourceUri is deliberately never set. It would restore the file icon
 * and the filename tooltip, which is the thing being removed.
 */

export type Node =
  | { kind: 'group'; group: Group }
  | { kind: 'reminder'; entry: Entry }
  | { kind: 'malformed'; malformed: MalformedEntry }

export class ReminderTree implements vscode.TreeDataProvider<Node> {
  private readonly changed = new vscode.EventEmitter<Node | undefined>()
  readonly onDidChangeTreeData = this.changed.event

  private entries: readonly Entry[] = []
  private malformed: readonly MalformedEntry[] = []
  private config: Config

  constructor(config: Config) {
    this.config = config
  }

  update(entries: readonly Entry[], malformed: readonly MalformedEntry[], config: Config): void {
    this.entries = entries
    this.malformed = malformed
    this.config = config
    this.changed.fire(undefined)
  }

  openCount(): number {
    return openEntries(this.entries, this.config).length
  }

  getTreeItem(node: Node): vscode.TreeItem {
    if (node.kind === 'group') {
      const item = new vscode.TreeItem(
        node.group.label === '' ? 'reminders' : node.group.label,
        vscode.TreeItemCollapsibleState.Expanded,
      )
      item.description = String(node.group.entries.length)
      item.contextValue = 'reminderGroup'
      return item
    }

    if (node.kind === 'malformed') {
      const item = new vscode.TreeItem(node.malformed.path)
      item.description = node.malformed.malformed.reason
      item.iconPath = new vscode.ThemeIcon(
        'warning',
        new vscode.ThemeColor('list.warningForeground'),
      )
      item.contextValue = 'reminderMalformed'
      item.command = {
        command: 'reminders.openMalformed',
        title: 'Open',
        arguments: [node.malformed.path],
      }
      return item
    }

    const { reminder } = node.entry
    const item = new vscode.TreeItem(reminder.title)
    const bits = [reminder.audience, reminder.category, reminder.raised].filter(
      (s): s is string => s !== undefined && s !== '',
    )
    item.description = bits.join(' · ')

    const tip = new vscode.MarkdownString(
      '**' + reminder.title + '**\n\n' + reminder.summary,
    )
    item.tooltip = tip

    // Checking the box closes the reminder -- which prompts, then writes.
    // TreeItem.checkboxState was finalized in 1.80; that is the engines floor.
    item.checkboxState = vscode.TreeItemCheckboxState.Unchecked
    item.contextValue = reminder.plan === undefined ? 'reminder' : 'reminderWithPlan'
    item.command = {
      command: 'reminders.openReminder',
      title: 'Open',
      arguments: [node.entry.path],
    }
    return item
  }

  getChildren(node?: Node): Node[] {
    if (node === undefined) {
      const groups = groupEntries(openEntries(this.entries, this.config), this.config).map(
        (group): Node => ({ kind: 'group', group }),
      )
      const bad = this.malformed.map((malformed): Node => ({ kind: 'malformed', malformed }))
      return [...groups, ...bad]
    }

    if (node.kind === 'group') {
      return node.group.entries.map((entry): Node => ({ kind: 'reminder', entry }))
    }

    return []
  }
}
