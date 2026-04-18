import * as vscode from 'vscode';
import { UsageTracker } from '../tracking/tracker';
import { TokenSession } from '../models/types';
import { formatTokenCount, formatDate, formatCost } from '../utils/formatting';
import { getModelPricing, calculateCost } from '../utils/pricing';

type TreeElement = RootNode | SessionNode | DetailNode;

interface RootNode {
  kind: 'root';
  label: string;
}

interface SessionNode {
  kind: 'session';
  session: TokenSession;
}

interface DetailNode {
  kind: 'detail';
  label: string;
  value: string;
}

const PROVIDER_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
};

export class UsageTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private changeListener: vscode.Disposable;

  constructor(private tracker: UsageTracker) {
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
      const providerTag = PROVIDER_LABEL[s.provider] ?? s.provider;

      const item = new vscode.TreeItem(
        formatDate(s.lastTimestamp),
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${formatTokenCount(total)} tokens · ${s.responses.length} responses · ${providerTag}`;
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
      if (!this.tracker.hasDataSources()) {
        return [{
          kind: 'detail',
          label: 'No data found',
          value: 'Use Claude Code or Codex CLI in this project first',
        }];
      }

      const summary = this.tracker.getSummary();
      if (summary.totalResponses === 0) {
        return [{
          kind: 'detail',
          label: 'No usage data yet',
          value: 'Use Claude Code or Codex CLI in this project first',
        }];
      }

      return [
        { kind: 'root', label: 'By Model' },
        { kind: 'root', label: 'Sessions' },
      ];
    }

    const summary = this.tracker.getSummary();
    const showCost = vscode.workspace.getConfiguration('tokenScope').get<boolean>('showCostEstimate', true);

    if (element.kind === 'root' && element.label === 'By Model') {
      return Object.entries(summary.byModel).map(([model, data]) => {
        const total = data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens;
        let costStr = '';
        if (showCost) {
          const pricing = getModelPricing(model);
          if (pricing) {
            costStr = ` · ${formatCost(calculateCost(data, pricing))}`;
          }
        }
        return {
          kind: 'detail' as const,
          label: model,
          value: `${formatTokenCount(total)} · ${data.count} calls${costStr}`,
        };
      });
    }

    if (element.kind === 'root' && element.label === 'Sessions') {
      const sessionLimit = vscode.workspace.getConfiguration('tokenScope').get<number>('sessionLimit', 50);
      const limited = summary.sessions.slice(0, sessionLimit);
      const remaining = summary.sessions.length - limited.length;
      const result: TreeElement[] = limited.map(s => ({
        kind: 'session' as const,
        session: s,
      }));
      if (remaining > 0) {
        result.push({
          kind: 'detail' as const,
          label: `+${remaining} more sessions`,
          value: 'Adjust tokenScope.sessionLimit in settings',
        });
      }
      return result;
    }

    if (element.kind === 'session') {
      const u = element.session.totalUsage;
      const details: TreeElement[] = [
        { kind: 'detail' as const, label: 'Provider', value: PROVIDER_LABEL[element.session.provider] ?? element.session.provider },
        { kind: 'detail' as const, label: 'Input', value: formatTokenCount(u.inputTokens) },
        { kind: 'detail' as const, label: 'Output', value: formatTokenCount(u.outputTokens) },
        { kind: 'detail' as const, label: 'Cache Write', value: formatTokenCount(u.cacheCreationTokens) },
        { kind: 'detail' as const, label: 'Cache Read', value: formatTokenCount(u.cacheReadTokens) },
      ];
      if (u.reasoningTokens > 0) {
        details.push({ kind: 'detail' as const, label: 'Reasoning', value: formatTokenCount(u.reasoningTokens) });
      }
      details.push({ kind: 'detail' as const, label: 'Responses', value: `${element.session.responses.length}` });
      if (showCost) {
        let sessionCost = 0;
        for (const r of element.session.responses) {
          const pricing = getModelPricing(r.model);
          if (pricing) {
            sessionCost += calculateCost(r.usage, pricing);
          }
        }
        if (sessionCost > 0) {
          details.push({ kind: 'detail' as const, label: 'Est. Cost', value: formatCost(sessionCost) });
        }
      }
      return details;
    }

    return [];
  }

  dispose(): void {
    this.changeListener.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
