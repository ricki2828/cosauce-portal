import { StagehandConfig } from '@browserbasehq/stagehand'

/**
 * CoSauce Portal - Stagehand Configuration
 *
 * AI-native browser testing with natural language commands.
 * Complements existing Playwright tests with self-healing capabilities.
 */
export default {
  // Model configuration
  modelName: 'claude-3-5-sonnet-20241022',
  modelClientOptions: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },

  // Browser settings
  headless: process.env.CI === 'true',
  debugDom: process.env.DEBUG === 'true',

  // Performance optimizations
  enableCaching: true, // Cache discovered elements
  domSettleTimeoutMs: 1000,

  // Verbose logging
  verbose: process.env.VERBOSE === 'true' ? 2 : 0,
} as StagehandConfig
