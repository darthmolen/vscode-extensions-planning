import * as vscode from 'vscode'

import { openEntries, shouldWarn, statusBarText, tooltipMarkdown } from './model.ts'
import type { Config, Entry, MalformedEntry } from './model.ts'

/**
 * The count beside the errors and warnings.
 *
 * Priority comes from `reminders.statusBarPriority`, default 49. VS Code's own
 * workbench registers the Problems indicator at LEFT/50 and higher priority sits
 * further left, so 49 lands just to its right on this machine today. That is an
 * internal constant with no compatibility promise, and on someone else's status
 * bar any extension may claim an adjacent number -- hence a setting rather than
 * a constant, and a success criterion that says "left cluster" rather than a pixel.
 */
export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem

  constructor(priority: number, command: string) {
    this.item = vscode.window.createStatusBarItem(
      'reminders.count',
      vscode.StatusBarAlignment.Left,
      priority,
    )
    this.item.name = 'Reminders'
    this.item.command = command
  }

  dispose(): void {
    this.item.dispose()
  }

  render(entries: readonly Entry[], malformed: readonly MalformedEntry[], config: Config): void {
    const open = openEntries(entries, config)
    const text = statusBarText(open.length)

    // A clean board costs no pixels. Malformed files still surface, because a
    // file that did not parse is the one thing worse than a reminder nobody read.
    if (text === '' && malformed.length === 0) {
      this.item.hide()
      return
    }

    this.item.text = text === '' ? '$(bell) !' : text
    this.item.backgroundColor =
      malformed.length > 0 || shouldWarn(entries, config)
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined

    const md = new vscode.MarkdownString(tooltipMarkdown(open, malformed, config))
    md.supportThemeIcons = true
    this.item.tooltip = md
    this.item.show()
  }
}
