import posthog from 'posthog-js'
import type { Platform } from '@/lib/constants/platforms'

// Define all analytics events with their properties
type AnalyticsEvents = {
  // User lifecycle
  user_signed_in: {
    sign_in_count: number
    is_new_user?: boolean
  }

  // Core funnel
  project_created: {
    project_id: string
    platform: Platform
    source: 'landing_page' | 'dashboard'
    type: 'design' | 'prototype'
  }
  design_generated: {
    project_id: string
    model: string
    is_byok: boolean
    type: 'design' | 'prototype'
  }
  design_exported: {
    project_id: string
    format: 'png' | 'zip'
    screen_count: number
  }

  // Monetization
  subscription_upgraded: {
    plan: 'pro'
    interval: 'monthly' | 'annual'
  }
  byok_configured: {
    provider: 'openrouter' | 'gemini'
  }
  byok_removed: {
    provider: 'openrouter' | 'gemini'
  }
}

export function trackEvent<T extends keyof AnalyticsEvents>(
  event: T,
  properties: AnalyticsEvents[T]
) {
  posthog.capture(event, properties)
}

// Hook version for React components
export function useAnalytics() {
  return {
    track: trackEvent,
    identify: (userId: string, properties?: Record<string, unknown>) => {
      posthog.identify(userId, properties)
    },
    reset: () => {
      posthog.reset()
    },
  }
}
