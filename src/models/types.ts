export type LLMProvider = 'anthropic' | 'openai' | 'gemini';

export interface TokenUsageEntry {
  id: string;
  provider: LLMProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
  note?: string;
}

export interface UsageSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  byProvider: Record<LLMProvider, ProviderSummary>;
  entryCount: number;
}

export interface ProviderSummary {
  inputTokens: number;
  outputTokens: number;
  entryCount: number;
}

/** Claude Code auto-tracking types */

export interface ClaudeCodeUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
}

export interface ClaudeCodeResponse {
  model: string;
  usage: ClaudeCodeUsage;
  timestamp: number;
}

export interface ClaudeCodeSession {
  sessionId: string;
  responses: ClaudeCodeResponse[];
  totalUsage: ClaudeCodeUsage;
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface ClaudeCodeSummary {
  sessions: ClaudeCodeSession[];
  totalUsage: ClaudeCodeUsage;
  totalResponses: number;
  byModel: Record<string, ClaudeCodeUsage & { count: number }>;
}
