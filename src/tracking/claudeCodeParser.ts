import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import {
  TokenUsage,
  TokenResponse,
  TokenSession,
  UsageSummary,
  DailyUsage,
} from '../models/types';

let outputChannel: vscode.OutputChannel | undefined;

export function setOutputChannel(channel: vscode.OutputChannel): void {
  outputChannel = channel;
}

function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, reasoningTokens: 0 };
}

export function addUsage(target: TokenUsage, source: TokenUsage): void {
  target.inputTokens += source.inputTokens;
  target.outputTokens += source.outputTokens;
  target.cacheCreationTokens += source.cacheCreationTokens;
  target.cacheReadTokens += source.cacheReadTokens;
  target.reasoningTokens += source.reasoningTokens;
}

export function emptySummary(): UsageSummary {
  return { sessions: [], totalUsage: emptyUsage(), totalResponses: 0, byModel: {}, dailyUsage: [] };
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
 */
export function findClaudeProjectDir(workspacePath: string): string | undefined {
  const claudeDir = workspacePathToClaudeDir(workspacePath);
  const fullPath = path.join(os.homedir(), '.claude', 'projects', claudeDir);

  if (fs.existsSync(fullPath)) {
    log(`Found Claude Code project directory: ${fullPath}`);
    return fullPath;
  }
  log(`Claude Code project directory not found: ${fullPath}`);
  return undefined;
}

/**
 * Parse a single JSONL line and extract Claude Code response data if present.
 */
function parseJsonlLine(line: string): { sessionId: string; response: TokenResponse } | undefined {
  try {
    const obj = JSON.parse(line);

    if (obj.type !== 'assistant') {
      return undefined;
    }

    const msg = obj.message;
    if (!msg || !msg.usage || msg.usage.output_tokens === undefined) {
      return undefined;
    }

    const usage: TokenUsage = {
      inputTokens: msg.usage.input_tokens ?? 0,
      outputTokens: msg.usage.output_tokens ?? 0,
      cacheCreationTokens: msg.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: msg.usage.cache_read_input_tokens ?? 0,
      reasoningTokens: 0,
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
  } catch (e) {
    log(`Failed to parse JSONL line: ${(e as Error).message}`);
    return undefined;
  }
}

/**
 * Parse all JSONL files in a Claude Code project directory.
 */
export function parseClaudeProjectDir(dirPath: string): UsageSummary {
  const sessions: Map<string, TokenSession> = new Map();
  const byModel: Record<string, TokenUsage & { count: number }> = {};
  const dailyMap: Map<string, { usage: TokenUsage; responseCount: number }> = new Map();
  const totalUsage = emptyUsage();
  let totalResponses = 0;

  let files: string[];
  try {
    files = fs.readdirSync(dirPath).filter(f => f.endsWith('.jsonl'));
  } catch (e) {
    log(`Failed to read directory ${dirPath}: ${(e as Error).message}`);
    return emptySummary();
  }

  log(`Parsing ${files.length} Claude Code JSONL files from ${dirPath}`);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (e) {
      log(`Failed to read file ${filePath}: ${(e as Error).message}`);
      continue;
    }

    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) { continue; }

      const parsed = parseJsonlLine(line);
      if (!parsed) { continue; }

      const { sessionId, response } = parsed;

      // Aggregate into session
      let session = sessions.get(sessionId);
      if (!session) {
        session = {
          sessionId,
          provider: 'claude-code',
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

      // Aggregate by day
      if (response.timestamp > 0) {
        const dateKey = new Date(response.timestamp).toISOString().slice(0, 10);
        let daily = dailyMap.get(dateKey);
        if (!daily) {
          daily = { usage: emptyUsage(), responseCount: 0 };
          dailyMap.set(dateKey, daily);
        }
        addUsage(daily.usage, response.usage);
        daily.responseCount += 1;
      }

      // Aggregate totals
      addUsage(totalUsage, response.usage);
      totalResponses += 1;
    }
  }

  const sortedSessions = Array.from(sessions.values())
    .sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  const dailyUsage: DailyUsage[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, usage: data.usage, responseCount: data.responseCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  log(`Parsed ${totalResponses} Claude Code responses across ${sessions.size} sessions`);

  return { sessions: sortedSessions, totalUsage, totalResponses, byModel, dailyUsage };
}
