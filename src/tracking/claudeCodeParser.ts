import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import {
  ClaudeCodeUsage,
  ClaudeCodeResponse,
  ClaudeCodeSession,
  ClaudeCodeSummary,
} from '../models/types';

function emptyUsage(): ClaudeCodeUsage {
  return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 };
}

function addUsage(target: ClaudeCodeUsage, source: ClaudeCodeUsage): void {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.cacheCreationTokens += source.cacheCreationTokens;
  target.cacheReadTokens += source.cacheReadTokens;
}

/**
 * Convert a workspace folder path to Claude Code's project directory name.
 * e.g. "/Users/hoon/Desktop/TokenScope" → "-Users-hoon-Desktop-TokenScope"
 */
function workspacePathToClaudeDir(workspacePath: string): string {
  return workspacePath.replace(/\//g, '-');
}

/**
 * Find the Claude Code projects directory for the current workspace.
 * Returns undefined if not found.
 */
function findClaudeProjectDir(workspacePath: string): string | undefined {
  const claudeDir = workspacePathToClaudeDir(workspacePath);
  const fullPath = path.join(os.homedir(), '.claude', 'projects', claudeDir);

  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  return undefined;
}

/**
 * Parse a single JSONL line and extract Claude Code response data if present.
 */
function parseJsonlLine(line: string): { sessionId: string; response: ClaudeCodeResponse } | undefined {
  try {
    const obj = JSON.parse(line);

    if (obj.type !== 'assistant') {
      return undefined;
    }

    const msg = obj.message;
    if (!msg || !msg.usage || msg.usage.output_tokens === undefined) {
      return undefined;
    }

    const usage: ClaudeCodeUsage = {
      inputTokens: msg.usage.input_tokens ?? 0,
      outputTokens: msg.usage.output_tokens ?? 0,
      cacheCreationTokens: msg.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
    };

    const timestamp = obj.timestamp ? new Date(obj.timestamp).getTime() : 0;

    return {
      sessionId: obj.sessionId ?? 'unknown',
      response: {
        model: msg.model ?? 'unknown',
        usage,
        timestamp,
      },
    };
  } catch {
    return undefined;
  }
}

/**
 * Parse all JSONL files in a Claude Code project directory.
 */
function parseProjectDir(dirPath: string): ClaudeCodeSummary {
  const sessions: Map<string, ClaudeCodeSession> = new Map();
  const byModel: Record<string, ClaudeCodeUsage & { count: number }> = {};
  const totalUsage = emptyUsage();
  let totalResponses = 0;

  let files: string[];
  try {
    files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
  } catch {
    return { sessions: [], totalUsage, totalResponses: 0, byModel: {} };
  }

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    for (const line of content.split('\n')) {
      if (!line.trim()) { continue; }

      const parsed = parseJsonlLine(line);
      if (!parsed) { continue; }

      const { sessionId, response } = parsed;

      // Aggregate into session
      let session = sessions.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          responses: [],
          totalUsage: emptyUsage(),
          firstTimestamp: response.timestamp,
          lastTimestamp: response.timestamp,
        };
        sessions.set(sessionId, session);
      }

      session.responses.push(response);
      addUsage(session.totalUsage, response.usage);
      session.firstTimestamp = Math.min(session.firstTimestamp, response.timestamp);
      session.lastTimestamp = Math.max(session.lastTimestamp, response.timestamp);

      // Aggregate by model
      if (!byModel[response.model]) {
        byModel[response.model] = { ...emptyUsage(), count: 0 };
      }
      addUsage(byModel[response.model], response.usage);
      byModel[response.model].count += 1;

      // Aggregate totals
      addUsage(totalUsage, response.usage);
      totalResponses += 1;
    }
  }

  const sortedSessions = Array.from(sessions.values())
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  return { sessions: sortedSessions, totalUsage, totalResponses, byModel };
}

/**
 * Main tracker class that provides Claude Code usage data for the current workspace.
 */
export class ClaudeCodeTracker implements vscode.Disposable {
  private _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private watcher: vscode.FileSystemWatcher | undefined;
  private projectDir: string | undefined;
  private cachedSummary: ClaudeCodeSummary | undefined;

  constructor() {
    this.projectDir = this.resolveProjectDir();
    this.setupWatcher();
  }

  private resolveProjectDir(): string | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      return undefined;
    }
    return findClaudeProjectDir(folders[0].uri.fsPath);
  }

  private setupWatcher(): void {
    if (!this.projectDir) { return; }

    const pattern = new vscode.RelativePattern(
      vscode.Uri.file(this.projectDir),
      '*.jsonl',
    );

    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.watcher.onDidChange(() => this.invalidate());
    this.watcher.onDidCreate(() => this.invalidate());
    this.watcher.onDidDelete(() => this.invalidate());
  }

  private invalidate(): void {
    this.cachedSummary = undefined;
    this._onDidChange.fire();
  }

  getSummary(): ClaudeCodeSummary {
    if (this.cachedSummary) {
      return this.cachedSummary;
    }

    if (!this.projectDir) {
      this.cachedSummary = {
        sessions: [],
        totalUsage: emptyUsage(),
        totalResponses: 0,
        byModel: {},
      };
    } else {
      this.cachedSummary = parseProjectDir(this.projectDir);
    }

    return this.cachedSummary;
  }

  hasProjectDir(): boolean {
    return this.projectDir !== undefined;
  }

  getProjectDirPath(): string | undefined {
    return this.projectDir;
  }

  dispose(): void {
    this.watcher?.dispose();
    this._onDidChange.dispose();
  }
}
