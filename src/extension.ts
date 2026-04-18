import * as vscode from 'vscode';
import { setOutputChannel } from './tracking/claudeCodeParser';
import { setCodexOutputChannel } from './tracking/codexParser';
import { UsageTracker } from './tracking/tracker';
import { StatusBarManager } from './ui/statusBar';
import { UsageTreeProvider } from './ui/treeView';
import { registerShowDashboardCommand } from './commands/showDashboard';
import { registerExportCsvCommand } from './commands/exportCsv';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('TokenScope');
  context.subscriptions.push(outputChannel);
  setOutputChannel(outputChannel);
  setCodexOutputChannel(outputChannel);

  try {
    const tracker = new UsageTracker();

    const statusBar = new StatusBarManager(tracker);
    const treeProvider = new UsageTreeProvider(tracker);

    vscode.window.registerTreeDataProvider('tokenScope.usageView', treeProvider);

    registerShowDashboardCommand(context, tracker);
    registerExportCsvCommand(context, tracker);

    statusBar.show();

    context.subscriptions.push(statusBar, treeProvider, tracker);

    outputChannel.appendLine('TokenScope activated successfully');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    outputChannel.appendLine(`Failed to activate TokenScope: ${message}`);
    vscode.window.showErrorMessage(`TokenScope failed to activate: ${message}`);
  }
}

export function deactivate() {
  // All disposables are cleaned up via context.subscriptions
}
