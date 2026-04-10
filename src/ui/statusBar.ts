import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { formatTokenCount } from '../utils/formatting';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private changeListener: vscode.Disposable;

  constructor(private tracker: ClaudeCodeTracker) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );
    this.item.command = 'tokenScope.showDashboard';
    this.refresh();

    this.changeListener = tracker.onDidChange(() => this.refresh());
  }

  refresh(): void {
    const summary = this.tracker.getSummary();
    const u = summary.totalUsage;
    const total = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;

    this.item.text = `$(hubot) ${formatTokenCount(total)} tokens`;
    this.item.tooltip = [
      'TokenScope — Claude Code Usage',
      `Input: ${formatTokenCount(u.inputTokens)}`,
      `Output: ${formatTokenCount(u.outputTokens)}`,
      `Cache Write: ${formatTokenCount(u.cacheCreationTokens)}`,
      `Cache Read: ${formatTokenCount(u.cacheReadTokens)}`,
      `Sessions: ${summary.sessions.length}`,
      `Responses: ${summary.totalResponses}`,
      '',
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
