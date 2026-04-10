import * as vscode from 'vscode';
import { UsageStore } from '../storage/usageStore';
import { formatTokenCount } from '../utils/formatting';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private changeListener: vscode.Disposable;

  constructor(private store: UsageStore) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'tokenScope.showDashboard';
    this.refresh();

    this.changeListener = store.onDidChange(() => this.refresh());
  }

  refresh(): void {
    const summary = this.store.getSummary();
    const total = summary.totalTokens;

    this.item.text = `$(dashboard) ${formatTokenCount(total)} tokens`;
    this.item.tooltip = [
      'TokenScope',
      `Input: ${formatTokenCount(summary.totalInputTokens)}`,
      `Output: ${formatTokenCount(summary.totalOutputTokens)}`,
      `Entries: ${summary.entryCount}`,
      'Click to open dashboard',
    ].join('\n');
  }

  show(): void {
    this.item.show();
  }

  dispose(): void {
    this.changeListener.dispose();
    this.item.dispose();
  }
}
