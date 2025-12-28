/**
 * Subscription Plan Constants
 *
 * Defines pricing tiers, message limits, and model access for the subscription system.
 */

export type PlanType = 'free' | 'pro';

export interface Plan {
  id: PlanType;
  name: string;
  price: number; // Monthly price in USD
  messagesPerMonth: number;
  allowedModels: string[];
  features: string[];
  stripePriceId?: string; // Set via environment variable
}

export const PLANS: Record<PlanType, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    messagesPerMonth: 2,
    allowedModels: [
      'gemini-3-flash-preview',
      'google/gemini-3-flash-preview',
    ],
    features: [
      '2 AI generations per month',
      'Flash model (fast & efficient)',
      'Unlimited projects',
      'Code export',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 20,
    messagesPerMonth: 50,
    allowedModels: [
      'gemini-3-flash-preview',
      'google/gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'google/gemini-3-pro-preview',
    ],
    features: [
      '50 AI generations per month',
      'Flash + Pro models',
      'Unlimited projects',
      'Code export',
      'Priority support',
      'Purchase extra messages',
    ],
  },
};

// Extra message pack pricing
export const MESSAGE_PACK = {
  messages: 20,
  priceUsd: 5,
  priceCents: 500,
};

/**
 * Get plan by ID
 */
export function getPlan(planId: PlanType): Plan {
  return PLANS[planId] || PLANS.free;
}

/**
 * Check if a model is allowed for a given plan
 */
export function isModelAllowedForPlan(model: string, planId: PlanType): boolean {
  const plan = getPlan(planId);
  return plan.allowedModels.includes(model);
}

/**
 * Admin-only models (require user.role === 'admin')
 */
export const ADMIN_ONLY_MODELS = [
  'anthropic/claude-opus-4.5',
  'anthropic/claude-sonnet-4.5',
  'openai/gpt-5.2',
] as const;

/**
 * Check if a model is admin-only
 */
export function isAdminOnlyModel(model: string): boolean {
  return ADMIN_ONLY_MODELS.includes(model as typeof ADMIN_ONLY_MODELS[number]);
}

/**
 * Get the default model for a plan
 */
export function getDefaultModelForPlan(planId: PlanType): string {
  return 'google/gemini-3-flash-preview';
}

/**
 * Calculate cost per message (for analytics)
 * Based on average token usage
 */
export const ESTIMATED_COSTS = {
  flash: {
    avgInputTokens: 6000,
    avgOutputTokens: 7500,
    avgCostPerMessage: 0.026, // ~$0.026 per message
  },
  pro: {
    avgInputTokens: 3500,
    avgOutputTokens: 10700,
    avgCostPerMessage: 0.135, // ~$0.135 per message
  },
};

/**
 * Calculate margin for a plan
 */
export function calculatePlanMargin(planId: PlanType): {
  bestCase: number; // All Flash
  worstCase: number; // All Pro (if allowed)
  averageCase: number; // 70% Flash, 30% Pro
} {
  const plan = getPlan(planId);

  if (planId === 'free') {
    const cost = plan.messagesPerMonth * ESTIMATED_COSTS.flash.avgCostPerMessage;
    return {
      bestCase: -cost,
      worstCase: -cost,
      averageCase: -cost,
    };
  }

  const flashCost = plan.messagesPerMonth * ESTIMATED_COSTS.flash.avgCostPerMessage;
  const proCost = plan.messagesPerMonth * ESTIMATED_COSTS.pro.avgCostPerMessage;
  const mixedCost = plan.messagesPerMonth * (0.7 * ESTIMATED_COSTS.flash.avgCostPerMessage + 0.3 * ESTIMATED_COSTS.pro.avgCostPerMessage);

  return {
    bestCase: ((plan.price - flashCost) / plan.price) * 100,
    worstCase: ((plan.price - proCost) / plan.price) * 100,
    averageCase: ((plan.price - mixedCost) / plan.price) * 100,
  };
}
