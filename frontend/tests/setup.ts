/**
 * Jest setup file - runs before all tests
 */
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Set default test environment variables
process.env.NODE_ENV = 'test'
process.env.BASE_URL = process.env.BASE_URL || 'https://cosauce-portal.vercel.app'

// Ensure Anthropic API key is available for Stagehand
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY not set - Stagehand tests will fail')
  console.warn('   Set it in .env.local or as an environment variable')
}
