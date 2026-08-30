import * as vscode from 'vscode'

import { closeReminder } from './format.ts'
import type { Config, Entry } from './model.ts'

const today = (): string => new Date().toISOString().slice(0, 10)

/**
 * Closing a reminder: prompt, write, save.
 *
 * The prompt is not politeness. SKILL.md is explicit that the note is the whole
 * point of keeping the file -- "done" on its own records that somebody ticked a
 * box, which is the one fact nobody will ever need.
 */
export async function closeWithPrompt(
  entry: Entry,
  status: 'done' | 'dropped',
  config: Config,
  uri: vscode.Uri,
): Promise<boolean> {
  const note = await vscode.window.showInputBox({
    title: status === 'done' ? 'Close reminder' : 'Drop reminder',
    prompt: entry.reminder.title,
    placeHolder:
      status === 'done'
        ? 'What actually happened?'
        : 'Why does this no longer matter?',
    ignoreFocusOut: true,
    validateInput: (value) =>
      value.trim() === '' ? 'A note is required — the answer is why the file is kept.' : undefined,
  })

  if (note === undefined) return false // cancelled: the file is not touched

  const document = vscode.workspace.textDocuments.find(
    (d) => d.uri.toString() === uri.toString(),
  )
  const before =
    document?.getText() ?? Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8')

  const after = closeReminder(before, { status, date: today(), note, label: config.closedLabel })
  if (typeof after !== 'string') {
    void vscode.window.showErrorMessage('Reminders: ' + after.refused)
    return false
  }

  if (document !== undefined) {
    // The file is open, and may be dirty. A raw filesystem write would lose the
    // buffer, so edit the document -- then save it, because applyEdit only
    // touches memory and the watcher would never fire.
    const edit = new vscode.WorkspaceEdit()
    edit.replace(
      uri,
      new vscode.Range(document.positionAt(0), document.positionAt(before.length)),
      after,
    )
    await vscode.workspace.applyEdit(edit)
    await document.save()
  } else {
    await vscode.workspace.fs.writeFile(uri, Buffer.from(after, 'utf8'))
  }

  void vscode.window.setStatusBarMessage(
    'Reminder ' + status + ': ' + entry.reminder.title,
    4000,
  )
  return true
}
