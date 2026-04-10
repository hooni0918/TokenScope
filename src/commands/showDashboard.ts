import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { createDashboardPanel } from '../ui/dashboard';

let currentPanel: vscode.WebviewPanel | undefined;

export function registerShowDashboardCommand(
  context: vscode.ExtensionContext,
  tracker: ClaudeCodeTracker,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.showDashboard',
    () => {
      if (currentPanel) {
        currentPanel.reveal(vscode.ViewColumn.One);
        return;
      }

      currentPanel = createDashboardPanel(context, tracker);

      currentPanel.onDidDispose(() => {
        currentPanel = undefined;
      }, null, context.subscriptions);
    },
  );

  context.subscriptions.push(disposable);
}
