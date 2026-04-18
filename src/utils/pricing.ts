import { ClaudeCodeUsage, ModelPricing } from '../models/types';

/**
 * Known Claude model pricing (USD per million tokens).
 * Patterns are matched in order; first match wins.
 */
const PRICING_TABLE: { pattern: RegExp; pricing: ModelPricing }[] = [
  {
    pattern: /claude-opus-4/i,
    pricing: { inputPerMillion: 15, outputPerMillion: 75, cacheWritePerMillion: 18.75, cacheReadPerMillion: 1.5 },
  },
  {
    pattern: /claude-sonnet-4/i,
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.3 },
  },
  {
    pattern: /claude-3[._-]5-sonnet/i,
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.3 },
  },
  {
    pattern: /claude-3[._-]5-haiku/i,
    pricing: { inputPerMillion: 0.8, outputPerMillion: 4, cacheWritePerMillion: 1, cacheReadPerMillion: 0.08 },
  },
  {
    pattern: /claude-3-opus/i,
    pricing: { inputPerMillion: 15, outputPerMillion: 75, cacheWritePerMillion: 18.75, cacheReadPerMillion: 1.5 },
  },
  {
    pattern: /claude-3-sonnet/i,
    pricing: { inputPerMillion: 3, outputPerMillion: 15, cacheWritePerMillion: 3.75, cacheReadPerMillion: 0.3 },
  },
  {
    pattern: /claude-3-haiku/i,
    pricing: { inputPerMillion: 0.25, outputPerMillion: 1.25, cacheWritePerMillion: 0.3, cacheReadPerMillion: 0.03 },
  },
];

export function getModelPricing(modelName: string): ModelPricing | undefined {
  for (const entry of PRICING_TABLE) {
    if (entry.pattern.test(modelName)) {
      return entry.pricing;
    }
  }
  return undefined;
}

export function calculateCost(usage: ClaudeCodeUsage, pricing: ModelPricing): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillion +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillion +
    (usage.cacheCreationTokens / 1_000_000) * pricing.cacheWritePerMillion +
    (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion
  );
}

export function calculateTotalCost(
  byModel: Record<string, ClaudeCodeUsage & { count: number }>,
): { totalCost: number; hasUnknownModels: boolean } {
  let totalCost = 0;
  let hasUnknownModels = false;

  for (const [model, usage] of Object.entries(byModel)) {
    const pricing = getModelPricing(model);
    if (pricing) {
      totalCost += calculateCost(usage, pricing);
    } else {
      hasUnknownModels = true;
    }
  }

  return { totalCost, hasUnknownModels };
}
