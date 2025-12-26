import Stripe from 'stripe';

// Ensure Stripe secret key is available
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled.');
}

// Initialize Stripe client
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  : null;

// Stripe price IDs from environment
export const STRIPE_PRICES = {
  proMonthly: process.env.STRIPE_PRO_PRICE_ID || '',
  proAnnual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || '',
  messagePack: process.env.STRIPE_MESSAGES_PRICE_ID || '',
};

// Billing interval type
export type BillingInterval = 'monthly' | 'annual';

// Helper to get price ID by interval
export function getProPriceId(interval: BillingInterval): string {
  return interval === 'annual' ? STRIPE_PRICES.proAnnual : STRIPE_PRICES.proMonthly;
}

// Webhook secret for verifying Stripe events
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerId?: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId || undefined,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  });

  return session;
}

/**
 * Create a Stripe Checkout session for one-time message pack purchase
 */
export async function createMessagePackCheckout({
  customerId,
  priceId,
  userId,
  successUrl,
  cancelUrl,
}: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      userId,
      type: 'message_pack',
    },
  });

  return session;
}

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Create or get a Stripe customer
 */
export async function getOrCreateCustomer({
  email,
  name,
  userId,
}: {
  email: string;
  name: string;
  userId: string;
}): Promise<Stripe.Customer | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });

  return customer;
}

/**
 * Get subscription details
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  return subscription;
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });

  return subscription;
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) {
    console.error('Stripe is not initialized');
    return null;
  }

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  return subscription;
}
