import * as vscode from 'vscode';
import { UsageStore } from '../storage/usageStore';
import { formatTokenCount, formatDate, providerDisplayName } from '../utils/formatting';
import { LLMProvider } from '../models/types';

function getNonce(): string {
  let text = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return text;
}

export function createDashboardPanel(
  context: vscode.ExtensionContext,
  store: UsageStore,
): vscode.WebviewPanel {
  const panel = vscode.window.createWebviewPanel(
    'tokenScopeDashboard',
    'TokenScope Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
    },
  );

  const cssUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.css'),
  );
  const jsUri = panel.webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, 'media', 'dashboard.js'),
  );

  function updateWebview() {
    const summary = store.getSummary();
    const entries = store.getAll().slice(-50).reverse();
    const nonce = getNonce();

    panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>TokenScope Dashboard</title>
</head>
<body>
  <h1>TokenScope Dashboard</h1>

  <div class="summary-cards">
    <div class="card">
      <div class="card-label">Total Tokens</div>
      <div class="card-value">${formatTokenCount(summary.totalTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Input Tokens</div>
      <div class="card-value">${formatTokenCount(summary.totalInputTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Output Tokens</div>
      <div class="card-value">${formatTokenCount(summary.totalOutputTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Total Entries</div>
      <div class="card-value">${summary.entryCount}</div>
    </div>
  </div>

  <h2>By Provider</h2>
  <div class="chart-container">
    ${(['anthropic', 'openai', 'gemini'] as LLMProvider[]).map(p => {
      const ps = summary.byProvider[p];
      const total = ps.inputTokens + ps.outputTokens;
      const maxTokens = Math.max(
        ...(['anthropic', 'openai', 'gemini'] as LLMProvider[]).map(
          pp => summary.byProvider[pp].inputTokens + summary.byProvider[pp].outputTokens,
        ),
        1,
      );
      const widthPercent = Math.max((total / maxTokens) * 100, 2);
      return `
        <div class="bar-row">
          <div class="bar-label">${providerDisplayName(p)}</div>
          <div class="bar-track">
            <div class="bar-fill provider-${p}" style="width: ${widthPercent}%"></div>
          </div>
          <div class="bar-value">${formatTokenCount(total)}</div>
        </div>`;
    }).join('')}
  </div>

  <h2>Recent Entries</h2>
  <table class="entries-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Provider</th>
        <th>Model</th>
        <th>Input</th>
        <th>Output</th>
        <th>Total</th>
        <th>Note</th>
      </tr>
    </thead>
    <tbody>
      ${entries.length === 0 ? '<tr><td colspan="7" class="empty">No entries yet. Use "TokenScope: Log Token Usage" to add one.</td></tr>' : ''}
      ${entries.map(e => `
        <tr>
          <td>${formatDate(e.timestamp)}</td>
          <td>${providerDisplayName(e.provider)}</td>
          <td>${e.model}</td>
          <td>${formatTokenCount(e.inputTokens)}</td>
          <td>${formatTokenCount(e.outputTokens)}</td>
          <td>${formatTokenCount(e.inputTokens + e.outputTokens)}</td>
          <td>${e.note ?? ''}</td>
        </tr>`).join('')}
    </tbody>
  </table>

  <script nonce="${nonce}" src="${jsUri}"></script>
</body>
</html>`;
  }

  updateWebview();

  const changeListener = store.onDidChange(() => updateWebview());
  panel.onDidDispose(() => changeListener.dispose());

  return panel;
}
