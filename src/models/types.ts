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
