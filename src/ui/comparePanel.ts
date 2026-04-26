import * as vscode from 'vscode';
import { TokenSession } from '../models/types';
import { SessionLabelStore } from '../labels/labelStore';
import { formatTokenCount, formatDate, formatCost } from '../utils/formatting';
import { getModelPricing, calculateCost } from '../utils/pricing';

const PROVIDER_LABEL: Record<string, string> = {
  'claude-code': 'Claude Code',
  'codex-cli': 'Codex CLI',
};

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function sessionCost(s: TokenSession): number {
  let cost = 0;
  for (const r of s.responses) {
    const p = getModelPricing(r.model);
    if (p) { cost += calculateCost(r.usage, p); }
  }
  return cost;
}

function diffNumberCell(a: number, b: number, formatter: (n: number) => string): string {
  const d = b - a;
  if (d === 0) { return '<span class="diff-zero">±0</span>'; }
  const sign = d > 0 ? '+' : '−';
  const cls = d > 0 ? 'diff-up' : 'diff-down';
  const pct = a > 0 ? ` (${sign}${Math.abs(Math.round((d / a) * 100))}%)` : '';
  return `<span class="${cls}">${sign}${formatter(Math.abs(d))}${pct}</span>`;
}

function diffCostCell(a: number, b: number): string {
  const d = b - a;
  if (Math.abs(d) < 0.0001) { return '<span class="diff-zero">±$0.00</span>'; }
  const sign = d > 0 ? '+' : '−';
  const cls = d > 0 ? 'diff-up' : 'diff-down';
  const pct = a > 0 ? ` (${sign}${Math.abs(Math.round((d / a) * 100))}%)` : '';
  return `<span class="${cls}">${sign}${formatCost(Math.abs(d))}${pct}</span>`;
}

export function createComparePanel(
  context: vscode.ExtensionContext,
  sessionA: TokenSession,
  sessionB: TokenSession,
  labelStore: SessionLabelStore,
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'tokenScopeCompare',
    'TokenScope: Compare Sessions',
    vscode.ViewColumn.Active,
    {
      enableScripts: false,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    },
  );

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.css'),
  );

  function render() {
    const nonce = getNonce();
    const labelA = labelStore.getLabel(sessionA.sessionId);
    const labelB = labelStore.getLabel(sessionB.sessionId);
    const ua = sessionA.totalUsage;
    const ub = sessionB.totalUsage;
    const totalA = ua.inputTokens + ua.outputTokens + ua.cacheCreationTokens + ua.cacheReadTokens;
    const totalB = ub.inputTokens + ub.outputTokens + ub.cacheCreationTokens + ub.cacheReadTokens;
    const costA = sessionCost(sessionA);
    const costB = sessionCost(sessionB);
    const titleA = labelA ?? formatDate(sessionA.lastTimestamp);
    const titleB = labelB ?? formatDate(sessionB.lastTimestamp);
    const showReasoning = ua.reasoningTokens > 0 || ub.reasoningTokens > 0;

    const numericRow = (name: string, va: number, vb: number, fmt: (n: number) => string) => `
      <tr>
        <td class="metric-name">${name}</td>
        <td class="metric-val">${fmt(va)}</td>
        <td class="metric-val">${fmt(vb)}</td>
        <td class="metric-diff">${diffNumberCell(va, vb, fmt)}</td>
      </tr>`;

    panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${panel.webview.cspSource} 'nonce-${nonce}';">
  <link rel="stylesheet" href="${cssUri}">
  <style nonce="${nonce}">
    .compare-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .compare-table th, .compare-table td { padding: 8px 12px; text-align: right; border-bottom: 1px solid var(--vscode-panel-border); }
    .compare-table th:first-child, .compare-table td.metric-name { text-align: left; }
    .compare-table th { font-weight: 600; }
    .metric-name { font-weight: 500; }
    .diff-up { color: var(--vscode-gitDecoration-deletedResourceForeground, #f48771); }
    .diff-down { color: var(--vscode-gitDecoration-addedResourceForeground, #6a9955); }
    .diff-zero { color: var(--vscode-descriptionForeground); }
    .session-meta td { color: var(--vscode-descriptionForeground); font-size: 0.9em; padding-top: 2px; padding-bottom: 8px; border-bottom: none; }
    .winner-badge { display: inline-block; margin-left: 6px; padding: 1px 6px; border-radius: 8px; background-color: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 0.8em; font-weight: 600; }
  </style>
  <title>Compare Sessions</title>
</head>
<body>
  <div class="header">
    <h1>Compare Sessions</h1>
  </div>
  <p class="note">Comparing two sessions side by side. Green diff = B used fewer tokens (cheaper). Red diff = B used more.</p>

  <table class="compare-table">
    <thead>
      <tr>
        <th>Metric</th>
        <th>A: ${titleA}${totalA <= totalB ? '<span class="winner-badge">cheaper</span>' : ''}</th>
        <th>B: ${titleB}${totalB < totalA ? '<span class="winner-badge">cheaper</span>' : ''}</th>
        <th>B − A</th>
      </tr>
      <tr class="session-meta">
        <td></td>
        <td>${PROVIDER_LABEL[sessionA.provider] ?? sessionA.provider} · ${formatDate(sessionA.lastTimestamp)}</td>
        <td>${PROVIDER_LABEL[sessionB.provider] ?? sessionB.provider} · ${formatDate(sessionB.lastTimestamp)}</td>
        <td></td>
      </tr>
    </thead>
    <tbody>
      ${numericRow('Total tokens', totalA, totalB, formatTokenCount)}
      ${numericRow('Input', ua.inputTokens, ub.inputTokens, formatTokenCount)}
      ${numericRow('Output', ua.outputTokens, ub.outputTokens, formatTokenCount)}
      ${numericRow('Cache Write', ua.cacheCreationTokens, ub.cacheCreationTokens, formatTokenCount)}
      ${numericRow('Cache Read', ua.cacheReadTokens, ub.cacheReadTokens, formatTokenCount)}
      ${showReasoning ? numericRow('Reasoning', ua.reasoningTokens, ub.reasoningTokens, formatTokenCount) : ''}
      ${numericRow('Responses', sessionA.responses.length, sessionB.responses.length, n => `${n}`)}
      <tr>
        <td class="metric-name">Est. Cost</td>
        <td class="metric-val">${formatCost(costA)}</td>
        <td class="metric-val">${formatCost(costB)}</td>
        <td class="metric-diff">${diffCostCell(costA, costB)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
  }

  render();

  return panel;
}
