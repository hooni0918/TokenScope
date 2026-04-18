import * as vscode from 'vscode';
import {
  TokenUsage,
  UsageSummary,
  DailyUsage,
} from '../models/types';
import { findClaudeProjectDir, parseClaudeProjectDir, emptyUsage, addUsage, emptySummary } from './claudeCodeParser';
import { findCodexSessionsDir, parseCodexSessions } from './codexParser';

/**
 * Merge two UsageSummary objects into one combined summary.
 */
function mergeSummaries(a: UsageSummary, b: UsageSummary): UsageSummary {
  // Merge sessions (sorted by lastTimestamp desc)
  const sessions = [...a.sessions, ...b.sessions]
    .sort((x, y) => y.lastTimestamp - x.lastTimestamp);

  // Merge totalUsage
  const totalUsage = emptyUsage();
  addUsage(totalUsage, a.totalUsage);
  addUsage(totalUsage, b.totalUsage);

  // Merge byModel
  const byModel: Record<string, TokenUsage & { count: number }> = {};
  for (const source of [a.byModel, b.byModel]) {
    for (const [model, data] of Object.entries(source)) {
      if (!byModel[model]) {
        byModel[model] = { ...emptyUsage(), count: 0 };
      }
      addUsage(byModel[model], data);
      byModel[model].count += data.count;
    }
  }

  // Merge dailyUsage
  const dailyMap = new Map<string, { usage: TokenUsage; responseCount: number }>();
  for (const source of [a.dailyUsage, b.dailyUsage]) {
    for (const day of source) {
      let existing = dailyMap.get(day.date);
      if (!existing) {
        existing = { usage: emptyUsage(), responseCount: 0 };
        dailyMap.set(day.date, existing);
      }
      addUsage(existing.usage, day.usage);
      existing.responseCount += day.responseCount;
    }
  }
  const dailyUsage: DailyUsage[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, usage: data.usage, responseCount: data.responseCount }))
    .sort((x, y) => x.date.localeCompare(y.date));

  return {
    sessions,
    totalUsage,
    totalResponses: a.totalResponses + b.totalResponses,
    byModel,
    dailyUsage,
  };
}

/**
 * Unified tracker that combines Claude Code and Codex CLI usage data.
 */
export class UsageTracker implements vscode.Disposable {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private disposables: vscode.Disposable[] = [];
  private claudeProjectDir: string | undefined;
  private codexSessionsDir: string | undefined;
  private workspacePath: string | undefined;
  private cachedSummary: UsageSummary | undefined;

  constructor() {
    const folders = vscode.workspace.workspaceFolders;
    this.workspacePath = folders && folders.length > 0 ? folders[0].uri.fsPath : undefined;

    if (this.workspacePath) {
      this.claudeProjectDir = findClaudeProjectDir(this.workspacePath);
      this.codexSessionsDir = findCodexSessionsDir();
    }

    this.setupWatchers();
  }

  private setupWatchers(): void {
    // Watch Claude Code project directory
    if (this.claudeProjectDir) {
      const claudePattern = new vscode.RelativePattern(
        vscode.Uri.file(this.claudeProjectDir),
        '*.jsonl',
      );
      const claudeWatcher = vscode.workspace.createFileSystemWatcher(claudePattern);
      this.disposables.push(claudeWatcher);
      this.disposables.push(claudeWatcher.onDidChange(() => this.invalidate()));
      this.disposables.push(claudeWatcher.onDidCreate(() => this.invalidate()));
      this.disposables.push(claudeWatcher.onDidDelete(() => this.invalidate()));
    }

    // Watch Codex CLI sessions directory
    if (this.codexSessionsDir) {
      const codexPattern = new vscode.RelativePattern(
        vscode.Uri.file(this.codexSessionsDir),
        'rollout-*.jsonl',
      );
      const codexWatcher = vscode.workspace.createFileSystemWatcher(codexPattern);
      this.disposables.push(codexWatcher);
      this.disposables.push(codexWatcher.onDidChange(() => this.invalidate()));
      this.disposables.push(codexWatcher.onDidCreate(() => this.invalidate()));
      this.disposables.push(codexWatcher.onDidDelete(() => this.invalidate()));
    }
  }

  private invalidate(): void {
    this.cachedSummary = undefined;
    this._onDidChange.fire();
  }

  getSummary(): UsageSummary {
    if (this.cachedSummary) {
      return this.cachedSummary;
    }

    const claudeSummary = this.claudeProjectDir
      ? parseClaudeProjectDir(this.claudeProjectDir)
      : emptySummary();

    const codexSummary = this.codexSessionsDir && this.workspacePath
      ? parseCodexSessions(this.codexSessionsDir, this.workspacePath)
      : emptySummary();

    this.cachedSummary = mergeSummaries(claudeSummary, codexSummary);
    return this.cachedSummary;
  }

  hasDataSources(): boolean {
    return this.claudeProjectDir !== undefined || this.codexSessionsDir !== undefined;
  }

  dispose(): void {
    for (const d of this.disposables) {
      d.dispose();
    }
    this.disposables = [];
    this._onDidChange.dispose();
  }
}
