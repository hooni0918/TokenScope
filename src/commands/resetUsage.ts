import * as vscode from 'vscode';
import { UsageStore } from '../storage/usageStore';

export function registerResetUsageCommand(
  context: vscode.ExtensionContext,
  store: UsageStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.resetUsage',
    async () => {
      const answer = await vscode.window.showWarningMessage(
        'TokenScope: Reset all token usage data for this workspace?',
        { modal: true },
        'Reset',
      );

      if (answer === 'Reset') {
        await store.clear();
        vscode.window.showInformationMessage('TokenScope: Usage data has been reset.');
      }
    },
  );

  context.subscriptions.push(disposable);
}
