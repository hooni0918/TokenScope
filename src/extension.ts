import * as vscode from 'vscode';
import { UsageStore } from './storage/usageStore';
import { StatusBarManager } from './ui/statusBar';
import { UsageTreeProvider } from './ui/treeView';
import { registerLogUsageCommand } from './commands/logUsage';
import { registerShowDashboardCommand } from './commands/showDashboard';
import { registerResetUsageCommand } from './commands/resetUsage';

export function activate(context: vscode.ExtensionContext) {
  const store = new UsageStore(context.workspaceState);

  const statusBar = new StatusBarManager(store);
  const treeProvider = new UsageTreeProvider(store);

  vscode.window.registerTreeDataProvider('tokenScope.usageView', treeProvider);

  registerLogUsageCommand(context, store);
  registerShowDashboardCommand(context, store);
  registerResetUsageCommand(context, store);

  statusBar.show();

  context.subscriptions.push(statusBar, treeProvider);
}

export function deactivate() {}
