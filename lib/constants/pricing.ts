/**
 * AI Model Pricing Constants
 *
 * Pricing is in USD per 1 million tokens.
 * These prices reflect what OpenRouter charges (their fee is already included).
 * Source: https://openrouter.ai/models
 */

export interface ModelPricing {
  input: number;        // $ per 1M input tokens
  output: number;       // $ per 1M output tokens
  cached: number;       // $ per 1M cached input tokens
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 3 Pro Preview - Default model
  'gemini-3-pro-preview': {
    input: 2.00,
    output: 12.00,
    cached: 0.50,  // 75% discount on cached tokens
  },
  'google/gemini-3-pro-preview': {
    input: 2.00,
    output: 12.00,
    cached: 0.50,
  },
  // Gemini 3 Flash Preview - Faster, cheaper
  'gemini-3-flash-preview': {
    input: 0.50,
    output: 3.00,
    cached: 0.125,
  },
  'google/gemini-3-flash-preview': {
    input: 0.50,
    output: 3.00,
    cached: 0.125,
  },
  // Gemini 2.5 Flash
  'gemini-2.5-flash': {
    input: 0.30,
    output: 2.50,
    cached: 0.075,
  },
  // Gemini 2.5 Pro
  'gemini-2.5-pro': {
    input: 1.25,
    output: 10.00,
    cached: 0.3125,
  },
};

// Default model if not found in pricing table
const DEFAULT_MODEL = 'gemini-3-pro-preview';

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cachedSavings: number;
  totalCost: number;
}

/**
 * Calculate the cost of a generation based on token usage
 * Note: Prices already include OpenRouter's fee, so no additional multiplier needed
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  cachedTokens: number,
  model: string,
  _provider: 'openrouter' | 'gemini' = 'openrouter'
): CostBreakdown {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

  // Non-cached input tokens at full price
  const nonCachedInputTokens = Math.max(0, inputTokens - cachedTokens);
  const nonCachedInputCost = (nonCachedInputTokens * pricing.input) / 1_000_000;

  // Cached tokens at discounted price
  const cachedInputCost = (cachedTokens * pricing.cached) / 1_000_000;

  // Total input cost
  const inputCost = nonCachedInputCost + cachedInputCost;

  // Calculate savings from caching
  const fullPriceForCached = (cachedTokens * pricing.input) / 1_000_000;
  const cachedSavings = fullPriceForCached - cachedInputCost;

  // Output cost
  const outputCost = (outputTokens * pricing.output) / 1_000_000;

  // Total cost (prices already include provider fees)
  const totalCost = inputCost + outputCost;

  return {
    inputCost,
    outputCost,
    cachedSavings,
    totalCost,
  };
}

/**
 * Format a cost value as USD string
 * Always shows 4 decimal places to match OpenRouter's precision
 */
export function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

/**
 * Format token count with commas
 */
export function formatTokens(tokens: number): string {
  return tokens.toLocaleString();
}
