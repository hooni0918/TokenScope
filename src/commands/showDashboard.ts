import * as vscode from 'vscode';
import { UsageTracker } from '../tracking/tracker';
import { SessionLabelStore } from '../labels/labelStore';
import { createDashboardPanel } from '../ui/dashboard';

let currentPanel: vscode.WebviewPanel | undefined;

export function registerShowDashboardCommand(
  context: vscode.ExtensionContext,
  tracker: UsageTracker,
  labelStore: SessionLabelStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.showDashboard',
    () => {
      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        return;
      }

      currentPanel = createDashboardPanel(context, tracker, labelStore);

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      }, null, context.subscriptions);
    },
  );

  context.subscriptions.push(disposable);
}
