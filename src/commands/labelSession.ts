import * as vscode from 'vscode';
import { UsageTracker } from '../tracking/tracker';
import { SessionLabelStore } from '../labels/labelStore';
import { TokenSession } from '../models/types';
import { formatDate, formatTokenCount } from '../utils/formatting';

const PROVIDER_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
};

export function registerLabelSessionCommand(
  context: vscode.ExtensionContext,
  tracker: UsageTracker,
  labelStore: SessionLabelStore,
): void {
  const disposable = vscode.commands.registerCommand(
    'tokenScope.labelSession',
    async (arg?: { session?: TokenSession }) => {
      let session = arg?.session;

      if (!session) {
        const summary = tracker.getSummary();
        if (summary.sessions.length === 0) {
          vscode.window.showInformationMessage('TokenScope: No sessions to label.');
          return;
        }
        const items = summary.sessions.map(s => {
          const u = s.totalUsage;
          const total = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
          const existing = labelStore.getLabel(s.sessionId);
          return {
            label: existing ? `[${existing}] ${formatDate(s.lastTimestamp)}` : formatDate(s.lastTimestamp),
            description: `${formatTokenCount(total)} · ${PROVIDER_LABEL[s.provider] ?? s.provider}`,
            session: s,
          };
        });
        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: 'Select a session to label',
        });
        if (!picked) { return; }
        session = picked.session;
      }

      const current = labelStore.getLabel(session.sessionId);
      const input = await vscode.window.showInputBox({
        prompt: 'Enter a label (leave empty to remove)',
        value: current ?? '',
        placeHolder: 'e.g., korean-skill, english-skill, task-A',
      });
      if (input === undefined) { return; }

      const trimmed = input.trim();
      if (trimmed === '') {
        if (current) {
          await labelStore.removeLabel(session.sessionId);
          vscode.window.showInformationMessage('TokenScope: Label removed.');
        }
      } else {
        await labelStore.setLabel(session.sessionId, trimmed);
        vscode.window.showInformationMessage(`TokenScope: Labeled as "${trimmed}".`);
      }
    },
  );

  context.subscriptions.push(disposable);
}
