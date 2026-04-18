import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { formatTokenCount, formatDate, formatCost } from '../utils/formatting';
import { calculateTotalCost, getModelPricing, calculateCost } from '../utils/pricing';

function getNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

export function createDashboardPanel(
  context: vscode.ExtensionContext,
  tracker: ClaudeCodeTracker,
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

  // Handle messages from webview
  const messageListener = panel.webview.onDidReceiveMessage(
    (message) => {
      if (message.command === 'exportCsv') {
        vscode.commands.executeCommand('tokenScope.exportCsv');
      }
    },
    undefined,
    context.subscriptions,
  );

  function updateWebview() {
    const nonce = getNonce();
    const summary = tracker.getSummary();
    const u = summary.totalUsage;
    const totalAll = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
    const modelEntries = Object.entries(summary.byModel);
    const maxModelTokens = modelEntries.length > 0
      ? Math.max(...modelEntries.map(([, d]) => d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens), 1)
      : 1;

    const showCost = vscode.workspace.getConfiguration('tokenScope').get<boolean>('showCostEstimate', true);
    const { totalCost, hasUnknownModels } = calculateTotalCost(summary.byModel);
    const sessionLimit = vscode.workspace.getConfiguration('tokenScope').get<number>('sessionLimit', 50);

    const modelColors = ['#d97706', '#10a37f', '#4285f4', '#e11d48', '#8b5cf6', '#06b6d4', '#059669', '#dc2626', '#7c3aed', '#0891b2'];

    const recentSessions = summary.sessions.slice(0, sessionLimit);
    const hiddenSessionCount = Math.max(0, summary.sessions.length - sessionLimit);

    // Daily trend (last 14 days)
    const dailyUsage = summary.dailyUsage.slice(-14);
    const maxDailyTokens = dailyUsage.length > 0
      ? Math.max(...dailyUsage.map(d => {
          const du = d.usage;
          return du.inputTokens + du.outputTokens + du.cacheCreationTokens + du.cacheReadTokens;
        }), 1)
      : 1;

    const hasData = tracker.hasProjectDir() && summary.totalResponses > 0;

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
  <div class="header">
    <h1>TokenScope</h1>
    ${hasData ? '<button class="export-btn" id="exportBtn">Export CSV</button>' : ''}
  </div>
  ${!tracker.hasProjectDir()
    ? '<p class="empty">No Claude Code data found for this workspace.<br>Use Claude Code in this project to start tracking.</p>'
    : summary.totalResponses === 0
    ? '<p class="empty">No usage data yet.<br>Use Claude Code in this project to start tracking.</p>'
    : `
  <div class="summary-cards">
    <div class="card">
      <div class="card-label">Total Tokens</div>
      <div class="card-value">${formatTokenCount(totalAll)}</div>
    </div>
    <div class="card">
      <div class="card-label">Input</div>
      <div class="card-value">${formatTokenCount(u.inputTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Output</div>
      <div class="card-value">${formatTokenCount(u.outputTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Cache Write</div>
      <div class="card-value">${formatTokenCount(u.cacheCreationTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Cache Read</div>
      <div class="card-value">${formatTokenCount(u.cacheReadTokens)}</div>
    </div>
    <div class="card">
      <div class="card-label">Sessions</div>
      <div class="card-value">${summary.sessions.length}</div>
    </div>
    <div class="card">
      <div class="card-label">Responses</div>
      <div class="card-value">${summary.totalResponses}</div>
    </div>
    ${showCost ? `
    <div class="card card-cost">
      <div class="card-label">Est. Cost${hasUnknownModels ? ' *' : ''}</div>
      <div class="card-value">${formatCost(totalCost)}</div>
    </div>` : ''}
  </div>
  ${showCost && hasUnknownModels ? '<p class="note">* Some models have unknown pricing. Cost may be underestimated.</p>' : ''}

  <h2>By Model</h2>
  <div class="chart-container">
    ${modelEntries.map(([model, data], i) => {
      const total = data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens;
      const widthPercent = Math.max((total / maxModelTokens) * 100, 2);
      const color = modelColors[i % modelColors.length];
      const pricing = getModelPricing(model);
      const costStr = showCost && pricing ? ` · ${formatCost(calculateCost(data, pricing))}` : '';
      return `
        <div class="bar-row">
          <div class="bar-label" title="${model}">${model}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${widthPercent}%; background-color: ${color}"></div>
          </div>
          <div class="bar-value">${formatTokenCount(total)}${costStr}</div>
        </div>`;
    }).join('')}
  </div>

  ${dailyUsage.length > 1 ? `
  <h2>Daily Trend</h2>
  <div class="trend-container">
    ${dailyUsage.map(d => {
      const du = d.usage;
      const dayTotal = du.inputTokens + du.outputTokens + du.cacheCreationTokens + du.cacheReadTokens;
      const heightPercent = Math.max((dayTotal / maxDailyTokens) * 100, 2);
      const dateLabel = d.date.slice(5); // MM-DD
      return `
        <div class="trend-bar-wrapper" title="${d.date}: ${formatTokenCount(dayTotal)} tokens, ${d.responseCount} responses">
          <div class="trend-value">${formatTokenCount(dayTotal)}</div>
          <div class="trend-bar-track">
            <div class="trend-bar-fill" style="height: ${heightPercent}%"></div>
          </div>
          <div class="trend-date">${dateLabel}</div>
        </div>`;
    }).join('')}
  </div>` : ''}

  <h2>Recent Sessions</h2>
  <table class="entries-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Responses</th>
        <th>Input</th>
        <th>Output</th>
        <th>Cache Write</th>
        <th>Cache Read</th>
        <th>Total</th>
        ${showCost ? '<th>Est. Cost</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${recentSessions.length === 0
        ? `<tr><td colspan="${showCost ? 8 : 7}" class="empty">No sessions yet.</td></tr>`
        : recentSessions.map(s => {
          const su = s.totalUsage;
          const st = su.inputTokens + su.outputTokens + su.cacheCreationTokens + su.cacheReadTokens;
          let sessionCost = 0;
          if (showCost) {
            for (const r of s.responses) {
              const p = getModelPricing(r.model);
              if (p) { sessionCost += calculateCost(r.usage, p); }
            }
          }
          return `
        <tr>
          <td>${formatDate(s.lastTimestamp)}</td>
          <td>${s.responses.length}</td>
          <td>${formatTokenCount(su.inputTokens)}</td>
          <td>${formatTokenCount(su.outputTokens)}</td>
          <td>${formatTokenCount(su.cacheCreationTokens)}</td>
          <td>${formatTokenCount(su.cacheReadTokens)}</td>
          <td>${formatTokenCount(st)}</td>
          ${showCost ? `<td>${formatCost(sessionCost)}</td>` : ''}
        </tr>`;
        }).join('')}
    </tbody>
  </table>
  ${hiddenSessionCount > 0 ? `<p class="note">${hiddenSessionCount} older sessions not shown. Adjust tokenScope.sessionLimit in settings to see more.</p>` : ''}
  `}

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const btn = document.getElementById('exportBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        vscode.postMessage({ command: 'exportCsv' });
      });
    }
  </script>
</body>
</html>`;
  }

  updateWebview();

  const changeListener = tracker.onDidChange(() => updateWebview());
  panel.onDidDispose(() => {
    changeListener.dispose();
    messageListener.dispose();
  });

  return panel;
}
