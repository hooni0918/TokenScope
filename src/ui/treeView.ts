import * as vscode from 'vscode';
import { UsageStore } from '../storage/usageStore';
import { LLMProvider } from '../models/types';
import { formatTokenCount, providerDisplayName } from '../utils/formatting';

type TreeElement = ProviderNode | ModelNode;

interface ProviderNode {
  kind: 'provider';
  provider: LLMProvider;
}

interface ModelNode {
  kind: 'model';
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const PROVIDERS: LLMProvider[] = ['anthropic', 'openai', 'gemini'];

export class UsageTreeProvider implements vscode.TreeDataProvider<TreeElement> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TreeElement | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private changeListener: vscode.Disposable;

  constructor(private store: UsageStore) {
    this.changeListener = store.onDidChange(() => this.refresh());
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeElement): vscode.TreeItem {
    if (element.kind === 'provider') {
      const summary = this.store.getSummary();
      const ps = summary.byProvider[element.provider];
      const total = ps.inputTokens + ps.outputTokens;

      const item = new vscode.TreeItem(
        providerDisplayName(element.provider),
        ps.entryCount > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.description = `${formatTokenCount(total)} tokens`;
      return item;
    }

    const total = element.inputTokens + element.outputTokens;
    const item = new vscode.TreeItem(element.model, vscode.TreeItemCollapsibleState.None);
    item.description = `${formatTokenCount(total)} (in: ${formatTokenCount(element.inputTokens)}, out: ${formatTokenCount(element.outputTokens)})`;
    return item;
  }

  getChildren(element?: TreeElement): TreeElement[] {
    if (!element) {
      return PROVIDERS.map(p => ({ kind: 'provider' as const, provider: p }));
    }

    if (element.kind === 'provider') {
      const entries = this.store.getAll().filter(e => e.provider === element.provider);
      const modelMap = new Map<string, { inputTokens: number; outputTokens: number }>();

      for (const entry of entries) {
        const existing = modelMap.get(entry.model);
        if (existing) {
          existing.inputTokens += entry.inputTokens;
          existing.outputTokens += entry.outputTokens;
        } else {
          modelMap.set(entry.model, {
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
          });
        }
      }

      return Array.from(modelMap.entries()).map(([model, data]) => ({
        kind: 'model' as const,
        provider: element.provider,
        model,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
      }));
    }

    return [];
  }

  dispose(): void {
    this.changeListener.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
