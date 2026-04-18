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
  dailyUsage: DailyUsage[];
}

export interface DailyUsage {
  date: string; // YYYY-MM-DD
  usage: ClaudeCodeUsage;
  responseCount: number;
}

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheWritePerMillion: number;
  cacheReadPerMillion: number;
}
