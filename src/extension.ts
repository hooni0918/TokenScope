import * as vscode from 'vscode';
import { ClaudeCodeTracker } from './tracking/claudeCodeParser';
import { StatusBarManager } from './ui/statusBar';
import { UsageTreeProvider } from './ui/treeView';
import { registerShowDashboardCommand } from './commands/showDashboard';

export function activate(context: vscode.ExtensionContext) {
  const tracker = new ClaudeCodeTracker();

  const statusBar = new StatusBarManager(tracker);
  const treeProvider = new UsageTreeProvider(tracker);

  vscode.window.registerTreeDataProvider('tokenScope.usageView', treeProvider);

  registerShowDashboardCommand(context, tracker);

  statusBar.show();

  context.subscriptions.push(statusBar, treeProvider, tracker);
}

export function deactivate() {}
