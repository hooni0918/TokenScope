import * as vscode from 'vscode';
import { setOutputChannel } from './tracking/claudeCodeParser';
import { setCodexOutputChannel } from './tracking/codexParser';
import { UsageTracker } from './tracking/tracker';
import { SessionLabelStore } from './labels/labelStore';
import { StatusBarManager } from './ui/statusBar';
import { UsageTreeProvider } from './ui/treeView';
import { registerShowDashboardCommand } from './commands/showDashboard';
import { registerExportCsvCommand } from './commands/exportCsv';
import { registerLabelSessionCommand } from './commands/labelSession';
import { registerCompareSessionsCommand } from './commands/compareSessions';

export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('TokenScope');
  context.subscriptions.push(outputChannel);
  setOutputChannel(outputChannel);
  setCodexOutputChannel(outputChannel);

  try {
    const tracker = new UsageTracker();
    const labelStore = new SessionLabelStore(context);

    const statusBar = new StatusBarManager(tracker);
    const treeProvider = new UsageTreeProvider(tracker, labelStore);

    vscode.window.registerTreeDataProvider('tokenScope.usageView', treeProvider);

    registerShowDashboardCommand(context, tracker, labelStore);
    registerExportCsvCommand(context, tracker);
    registerLabelSessionCommand(context, tracker, labelStore);
    registerCompareSessionsCommand(context, tracker, labelStore);

    statusBar.show();

    context.subscriptions.push(statusBar, treeProvider, tracker, labelStore);

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
