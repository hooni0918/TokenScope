import * as vscode from 'vscode';
import { UsageTracker } from '../tracking/tracker';
import { formatTokenCount, formatCost } from '../utils/formatting';
import { calculateTotalCost } from '../utils/pricing';

export class StatusBarManager implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private changeListener: vscode.Disposable;

  constructor(private tracker: UsageTracker) {
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

    const showCost = vscode.workspace.getConfiguration('tokenScope').get<boolean>('showCostEstimate', true);
    const { totalCost } = calculateTotalCost(summary.byModel);
    const costStr = showCost && totalCost > 0 ? ` · ${formatCost(totalCost)}` : '';

    this.item.text = `$(hubot) ${formatTokenCount(total)} tokens${costStr}`;
    this.item.tooltip = [
      'TokenScope — AI Token Usage',
      '',
      `Input: ${formatTokenCount(u.inputTokens)}`,
      `Output: ${formatTokenCount(u.outputTokens)}`,
      `Cache Write: ${formatTokenCount(u.cacheCreationTokens)}`,
      `Cache Read: ${formatTokenCount(u.cacheReadTokens)}`,
      ...(u.reasoningTokens > 0 ? [`Reasoning: ${formatTokenCount(u.reasoningTokens)}`] : []),
      '',
      `Sessions: ${summary.sessions.length}`,
      `Responses: ${summary.totalResponses}`,
      ...(showCost && totalCost > 0 ? ['', `Est. Cost: ${formatCost(totalCost)}`] : []),
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
