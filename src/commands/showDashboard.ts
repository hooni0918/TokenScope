import * as vscode from 'vscode';
import { UsageStore } from '../storage/usageStore';
import { createDashboardPanel } from '../ui/dashboard';

let currentPanel: vscode.WebviewPanel | undefined;

export function registerShowDashboardCommand(
  context: vscode.ExtensionContext,
  store: UsageStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.showDashboard',
    () => {
      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        return;
      }

      currentPanel = createDashboardPanel(context, store);

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      }, null, context.subscriptions);
    },
  );

  context.subscriptions.push(disposable);
}
