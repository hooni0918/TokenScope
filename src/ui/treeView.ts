import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { ClaudeCodeSession } from '../models/types';
import { formatTokenCount } from '../utils/formatting';

type TreeElement = RootNode | SessionNode | DetailNode;

interface RootNode {
  kind: 'root';
  label: string;
}

interface SessionNode {
  kind: 'session';
  session: ClaudeCodeSession;
}

interface DetailNode {
  kind: 'detail';
  label: string;
  value: string;
}

export class UsageTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private changeListener: vscode.Disposable;

  constructor(private tracker: ClaudeCodeTracker) {
    this.changeListener = tracker.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    if (element.kind === 'root') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Expanded);
      if (element.label === 'By Model') {
        item.iconPath = new vscode.ThemeIcon('symbol-class');
      } else {
        item.iconPath = new vscode.ThemeIcon('history');
      }
      return item;
    }

    if (element.kind === 'session') {
      const s = element.session;
      const u = s.totalUsage;
      const total = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
      const date = new Date(s.lastTimestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      const item = new vscode.TreeItem(
        dateStr,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${formatTokenCount(total)} tokens · ${s.responses.length} responses`;
      item.iconPath = new vscode.ThemeIcon('comment-discussion');
      return item;
    }

    // detail
    const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
    item.description = element.value;
    return item;
  }

  getChildren(element?: TreeElement): TreeElement[] {
    if (!element) {
      if (!this.tracker.hasProjectDir()) {
        return [{
          kind: 'detail',
          label: 'No Claude Code data found',
          value: 'Open a project folder with Claude Code history',
        }];
      }

      const summary = this.tracker.getSummary();
      if (summary.totalResponses === 0) {
        return [{
          kind: 'detail',
          label: 'No usage data yet',
          value: 'Use Claude Code in this project first',
        }];
      }

      return [
        { kind: 'root', label: 'By Model' },
        { kind: 'root', label: 'Sessions' },
      ];
    }

    const summary = this.tracker.getSummary();

    if (element.kind === 'root' && element.label === 'By Model') {
      return Object.entries(summary.byModel).map(([model, data]) => {
        const total = data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens;
        return {
          kind: 'detail' as const,
          label: model,
          value: `${formatTokenCount(total)} · ${data.count} calls`,
        };
      });
    }

    if (element.kind === 'root' && element.label === 'Sessions') {
      return summary.sessions.slice(0, 20).map(s => ({
        kind: 'session' as const,
        session: s,
      }));
    }

    if (element.kind === 'session') {
      const u = element.session.totalUsage;
      return [
        { kind: 'detail' as const, label: 'Input', value: formatTokenCount(u.inputTokens) },
        { kind: 'detail' as const, label: 'Output', value: formatTokenCount(u.outputTokens) },
        { kind: 'detail' as const, label: 'Cache Write', value: formatTokenCount(u.cacheCreationTokens) },
        { kind: 'detail' as const, label: 'Cache Read', value: formatTokenCount(u.cacheReadTokens) },
        { kind: 'detail' as const, label: 'Responses', value: `${element.session.responses.length}` },
      ];
    }

    return [];
  }

  dispose(): void {
    this.changeListener.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
