import * as vscode from 'vscode';
import { UsageTracker } from '../tracking/tracker';
import { SessionLabelStore } from '../labels/labelStore';
import { TokenSession } from '../models/types';
import { createComparePanel } from '../ui/comparePanel';
import { formatDate, formatTokenCount } from '../utils/formatting';

const PROVIDER_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
};

export function registerCompareSessionsCommand(
  context: vscode.ExtensionContext,
  tracker: UsageTracker,
  labelStore: SessionLabelStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.compareSessions',
    async () => {
      const summary = tracker.getSummary();
      if (summary.sessions.length < 2) {
        vscode.window.showInformationMessage('TokenScope: Need at least 2 sessions to compare.');
        return;
      }

      const buildItem = (s: TokenSession) => {
        const u = s.totalUsage;
        const total = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
        const existing = labelStore.getLabel(s.sessionId);
        return {
          label: existing ? `[${existing}] ${formatDate(s.lastTimestamp)}` : formatDate(s.lastTimestamp),
          description: `${formatTokenCount(total)} · ${PROVIDER_LABEL[s.provider] ?? s.provider}`,
          session: s,
        };
      };

      const items = summary.sessions.map(buildItem);
      const a = await vscode.window.showQuickPick(items, {
        placeHolder: 'Pick session A (baseline)',
      });
      if (!a) { return; }

      const remaining = items.filter(it => it.session.sessionId !== a.session.sessionId);
      const b = await vscode.window.showQuickPick(remaining, {
        placeHolder: 'Pick session B (comparison)',
      });
      if (!b) { return; }

      createComparePanel(context, a.session, b.session, labelStore);
    },
  );

  context.subscriptions.push(disposable);
}
