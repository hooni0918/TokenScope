import * as vscode from 'vscode';
import { ClaudeCodeTracker } from '../tracking/claudeCodeParser';
import { formatTokenCount, formatDate } from '../utils/formatting';

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

  function updateWebview() {
    const summary = tracker.getSummary();
    const u = summary.totalUsage;
    const totalAll = u.inputTokens + u.outputTokens + u.cacheCreationTokens + u.cacheReadTokens;
    const modelEntries = Object.entries(summary.byModel);
    const maxModelTokens = Math.max(
      ...modelEntries.map(([, d]) => d.inputTokens + d.outputTokens + d.cacheCreationTokens + d.cacheReadTokens),
      1,
    );

    const modelColors = ['#d97706', '#10a37f', '#4285f4', '#e11d48', '#8b5cf6', '#06b6d4'];

    const recentSessions = summary.sessions.slice(0, 15);

    panel.webview.html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${panel.webview.cspSource};">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${cssUri}">
  <title>TokenScope Dashboard</title>
</head>
<body>
  <h1>TokenScope — Claude Code Usage</h1>
  ${!tracker.hasProjectDir()
    ? '<p class="empty">No Claude Code data found for this workspace. Use Claude Code in this project to start tracking.</p>'
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
  </div>

  <h2>By Model</h2>
  <div class="chart-container">
    ${modelEntries.map(([model, data], i) => {
      const total = data.inputTokens + data.outputTokens + data.cacheCreationTokens + data.cacheReadTokens;
      const widthPercent = Math.max((total / maxModelTokens) * 100, 2);
      const color = modelColors[i % modelColors.length];
      return `
        <div class="bar-row">
          <div class="bar-label">${model}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${widthPercent}%; background-color: ${color}"></div>
          </div>
          <div class="bar-value">${formatTokenCount(total)}</div>
        </div>`;
    }).join('')}
  </div>

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
      </tr>
    </thead>
    <tbody>
      ${recentSessions.length === 0
        ? '<tr><td colspan="7" class="empty">No sessions yet.</td></tr>'
        : recentSessions.map(s => {
          const su = s.totalUsage;
          const st = su.inputTokens + su.outputTokens + su.cacheCreationTokens + su.cacheReadTokens;
          return `
        <tr>
          <td>${formatDate(s.lastTimestamp)}</td>
          <td>${s.responses.length}</td>
          <td>${formatTokenCount(su.inputTokens)}</td>
          <td>${formatTokenCount(su.outputTokens)}</td>
          <td>${formatTokenCount(su.cacheCreationTokens)}</td>
          <td>${formatTokenCount(su.cacheReadTokens)}</td>
          <td>${formatTokenCount(st)}</td>
        </tr>`;
        }).join('')}
    </tbody>
  </table>
  `}
</body>
</html>`;
  }

  updateWebview();

  const changeListener = tracker.onDidChange(() => updateWebview());
  panel.onDidDispose(() => changeListener.dispose());

  return panel;
}
