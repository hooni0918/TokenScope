import { TokenUsage, ModelPricing } from '../models/types';

/**
 * Known model pricing (USD per million tokens).
 * Patterns are matched in order; first match wins.
 */
const PRICING_TABLE: { pattern: RegExp; pricing: ModelPricing }[] = [
  // ── Claude models ──
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

  // ── OpenAI models ──
  {
    pattern: /codex-mini/i,
    pricing: { inputPerMillion: 1.5, outputPerMillion: 6, cacheWritePerMillion: 0, cacheReadPerMillion: 0.375 },
  },
  {
    pattern: /o4-mini/i,
    pricing: { inputPerMillion: 1.1, outputPerMillion: 4.4, cacheWritePerMillion: 0, cacheReadPerMillion: 0.275 },
  },
  {
    pattern: /o3-mini/i,
    pricing: { inputPerMillion: 1.1, outputPerMillion: 4.4, cacheWritePerMillion: 0, cacheReadPerMillion: 0.275 },
  },
  {
    // o3 but not o3-mini (already matched above)
    pattern: /o3(?!-)/i,
    pricing: { inputPerMillion: 2, outputPerMillion: 8, cacheWritePerMillion: 0, cacheReadPerMillion: 0.5 },
  },
  {
    pattern: /gpt-4\.1-nano/i,
    pricing: { inputPerMillion: 0.1, outputPerMillion: 0.4, cacheWritePerMillion: 0, cacheReadPerMillion: 0.025 },
  },
  {
    pattern: /gpt-4\.1-mini/i,
    pricing: { inputPerMillion: 0.4, outputPerMillion: 1.6, cacheWritePerMillion: 0, cacheReadPerMillion: 0.1 },
  },
  {
    // gpt-4.1 but not gpt-4.1-mini or nano (already matched above)
    pattern: /gpt-4\.1(?!-)/i,
    pricing: { inputPerMillion: 2, outputPerMillion: 8, cacheWritePerMillion: 0, cacheReadPerMillion: 0.5 },
  },
  {
    pattern: /gpt-4o-mini/i,
    pricing: { inputPerMillion: 0.15, outputPerMillion: 0.6, cacheWritePerMillion: 0, cacheReadPerMillion: 0.075 },
  },
  {
    // gpt-4o but not gpt-4o-mini
    pattern: /gpt-4o(?!-)/i,
    pricing: { inputPerMillion: 2.5, outputPerMillion: 10, cacheWritePerMillion: 0, cacheReadPerMillion: 1.25 },
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

export function calculateCost(usage: TokenUsage, pricing: ModelPricing): number {
  return (
    (usage.inputTokens / 1_000_000) * pricing.inputPerMillion +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMillion +
    (usage.cacheCreationTokens / 1_000_000) * pricing.cacheWritePerMillion +
    (usage.cacheReadTokens / 1_000_000) * pricing.cacheReadPerMillion
  );
}

export function calculateTotalCost(
  byModel: Record<string, TokenUsage & { count: number }>,
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
