/** Provider-agnostic token usage tracking types */

export type Provider = 'claude-code' | 'codex-cli';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number; // Claude: cache_creation_input_tokens, Codex: 0
  cacheReadTokens: number;     // Claude: cache_read_input_tokens, Codex: cached_input_tokens
  reasoningTokens: number;     // Claude: 0, Codex: reasoning_output_tokens (subset of output)
}

export interface TokenResponse {
  model: string;
  usage: TokenUsage;
  timestamp: number;
}

export interface TokenSession {
  sessionId: string;
  provider: Provider;
  responses: TokenResponse[];
  totalUsage: TokenUsage;
  firstTimestamp: number;
  lastTimestamp: number;
}

export interface UsageSummary {
  sessions: TokenSession[];
  totalUsage: TokenUsage;
  totalResponses: number;
  byModel: Record<string, TokenUsage & { count: number }>;
  dailyUsage: DailyUsage[];
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  usage: TokenUsage;
  responseCount: number;
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion: number;
  cacheReadPerMillion: number;
}
