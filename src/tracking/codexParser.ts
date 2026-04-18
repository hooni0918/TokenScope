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
import { emptyUsage, addUsage, emptySummary } from './claudeCodeParser';

let outputChannel: vscode.OutputChannel | undefined;

export function setCodexOutputChannel(channel: vscode.OutputChannel): void {
  outputChannel = channel;
}

function log(message: string): void {
  outputChannel?.appendLine(`[${new Date().toISOString()}] [Codex] ${message}`);
}

/**
 * Normalize a filesystem path for comparison.
 */
function normalizePath(p: string): string {
  return path.resolve(p).replace(/\/+$/, '');
}

/**
 * Find the Codex CLI sessions directory if it exists.
 */
export function findCodexSessionsDir(): string | undefined {
  const codexHome = process.env['CODEX_HOME'] || path.join(os.homedir(), '.codex');
  const sessionsDir = path.join(codexHome, 'sessions');
  if (fs.existsSync(sessionsDir)) {
    log(`Found Codex sessions directory: ${sessionsDir}`);
    return sessionsDir;
  }
  return undefined;
}

/**
 * Try to read the default model from Codex config.
 */
function readCodexConfigModel(): string | undefined {
  const codexHome = process.env['CODEX_HOME'] || path.join(os.homedir(), '.codex');
  const configPath = path.join(codexHome, 'config.toml');
  try {
    if (!fs.existsSync(configPath)) { return undefined; }
    const content = fs.readFileSync(configPath, 'utf-8');
    // Simple TOML key extraction — model = "o4-mini"
    const match = content.match(/^\s*model\s*=\s*"([^"]+)"/m);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse a single Codex CLI rollout JSONL file.
 * Returns a session only if its cwd matches the workspace path.
 */
function parseRolloutFile(filePath: string, workspacePath: string): TokenSession | undefined {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    log(`Failed to read ${filePath}: ${(e as Error).message}`);
    return undefined;
  }

  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) { return undefined; }

  // First line must be session_meta
  let meta: Record<string, unknown>;
  try {
    const firstLine = JSON.parse(lines[0]);
    if (firstLine.type !== 'session_meta') { return undefined; }
    meta = firstLine.payload as Record<string, unknown>;
  } catch {
    return undefined;
  }

  // Check workspace match
  const sessionCwd = meta.cwd as string | undefined;
  if (!sessionCwd || normalizePath(sessionCwd) !== normalizePath(workspacePath)) {
    return undefined;
  }

  const sessionId = (meta.id as string) || path.basename(filePath, '.jsonl');
  const configModel = readCodexConfigModel();
  let currentModel = configModel || 'unknown';

  const responses: TokenResponse[] = [];

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);

      // Try to extract model from response items
      if (obj.type === 'response_item') {
        const payload = obj.payload;
        if (payload && typeof payload === 'object') {
          // OpenAI response items may contain a model field
          const m = payload.model || payload.response?.model;
          if (typeof m === 'string' && m) {
            currentModel = m;
          }
        }
      }

      // Extract per-turn token usage from token_count events
      if (obj.type === 'event_msg' && obj.payload?.type === 'token_count') {
        const lastUsage = obj.payload.info?.last_token_usage;
        if (lastUsage && ((lastUsage.input_tokens ?? 0) > 0 || (lastUsage.output_tokens ?? 0) > 0)) {
          const cachedInput = lastUsage.cached_input_tokens ?? 0;
          const rawInput = lastUsage.input_tokens ?? 0;

          const usage: TokenUsage = {
            // Split input into non-cached and cached portions
            inputTokens: Math.max(0, rawInput - cachedInput),
            outputTokens: lastUsage.output_tokens ?? 0,
            cacheCreationTokens: 0,
            cacheReadTokens: cachedInput,
            reasoningTokens: lastUsage.reasoning_output_tokens ?? 0,
          };

          responses.push({
            model: currentModel,
            usage,
            timestamp: new Date(obj.timestamp).getTime(),
          });
        }
      }
    } catch {
      continue;
    }
  }

  if (responses.length === 0) { return undefined; }

  const totalUsage = emptyUsage();
  for (const r of responses) {
    addUsage(totalUsage, r.usage);
  }

  return {
    sessionId,
    provider: 'codex-cli',
    responses,
    totalUsage,
    firstTimestamp: Math.min(...responses.map(r => r.timestamp)),
    lastTimestamp: Math.max(...responses.map(r => r.timestamp)),
  };
}

/**
 * Parse all Codex CLI rollout files matching the given workspace path.
 */
export function parseCodexSessions(sessionsDir: string, workspacePath: string): UsageSummary {
  let files: string[];
  try {
    files = fs.readdirSync(sessionsDir).filter(f => f.startsWith('rollout-') && f.endsWith('.jsonl'));
  } catch (e) {
    log(`Failed to read Codex sessions directory: ${(e as Error).message}`);
    return emptySummary();
  }

  log(`Scanning ${files.length} Codex rollout files`);

  const sessions: TokenSession[] = [];
  const byModel: Record<string, TokenUsage & { count: number }> = {};
  const dailyMap: Map<string, { usage: TokenUsage; responseCount: number }> = new Map();
  const totalUsage = emptyUsage();
  let totalResponses = 0;

  for (const file of files) {
    const session = parseRolloutFile(path.join(sessionsDir, file), workspacePath);
    if (!session) { continue; }

    sessions.push(session);

    for (const response of session.responses) {
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

      addUsage(totalUsage, response.usage);
      totalResponses += 1;
    }
  }

  sessions.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  const dailyUsage: DailyUsage[] = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, usage: data.usage, responseCount: data.responseCount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  log(`Parsed ${totalResponses} Codex responses across ${sessions.length} sessions`);

  return { sessions, totalUsage, totalResponses, byModel, dailyUsage };
}
