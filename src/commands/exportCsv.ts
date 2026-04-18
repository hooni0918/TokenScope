import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { getModelPricing, calculateCost } from '../utils/pricing';

export function registerExportCsvCommand(
  context: vscode.ExtensionContext,
  tracker: ClaudeCodeTracker,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.exportCsv',
    async () => {
      const summary = tracker.getSummary();

      if (summary.totalResponses === 0) {
        vscode.window.showInformationMessage('TokenScope: No data to export.');
        return;
      }

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('tokenscope-export.csv'),
        filters: { 'CSV': ['csv'] },
      });
      if (!uri) { return; }

      const rows = ['Session ID,Date,Responses,Input,Output,Cache Write,Cache Read,Total,Estimated Cost'];
      for (const s of summary.sessions) {
        const u = s.totalUsage;
        const total = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
        let cost = 0;
        for (const r of s.responses) {
          const pricing = getModelPricing(r.model);
          if (pricing) { cost += calculateCost(r.usage, pricing); }
        }
        rows.push([
          s.sessionId,
          new Date(s.lastTimestamp).toISOString(),
          s.responses.length,
          u.inputTokens,
          u.outputTokens,
          u.cacheCreationTokens,
          u.cacheReadTokens,
          total,
          cost.toFixed(4),
        ].join(','));
      }

      await vscode.workspace.fs.writeFile(uri, Buffer.from(rows.join('\n'), 'utf-8'));
      vscode.window.showInformationMessage(`TokenScope: Exported ${summary.sessions.length} sessions to CSV.`);
    },
  );

  context.subscriptions.push(disposable);
}
