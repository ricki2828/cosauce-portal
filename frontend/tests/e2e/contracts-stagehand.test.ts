/**
 * CoSauce Portal - Contracts Generation Tests (Stagehand)
 *
 * AI-native tests for contract generation flows.
 * Complements existing Playwright tests with self-healing capabilities.
 */
import { Stagehand } from '@browserbasehq/stagehand'
import { expect } from '@jest/globals'

describe('Contracts - AI Native Tests', () => {
  let stagehand: Stagehand
  const baseURL = process.env.BASE_URL || 'https://cosauce-portal.vercel.app'

  beforeAll(async () => {
    stagehand = new Stagehand({
      env: 'LOCAL',
      verbose: 1,
      headless: process.env.CI === 'true',
    })
    await stagehand.init()
  })

  afterAll(async () => {
    await stagehand.close()
  })

  test('can navigate to contracts page', async () => {
    const page = stagehand.page

    await page.goto(baseURL)

    // Navigate using natural language
    await stagehand.act('navigate to contracts or contract generator page')

    await page.waitForTimeout(2000)

    // Verify we're on contracts page
    const heading = await stagehand.extract('the main page heading or title')

    expect(heading.toLowerCase()).toMatch(/contract/)
  }, 30000)

  test('can select MSA contract type', async () => {
    const page = stagehand.page

    await page.goto(`${baseURL}/contracts`)

    // Select MSA
    await stagehand.act('select or click the MSA or Master Services Agreement option')

    await page.waitForTimeout(1000)

    // Verify MSA is selected
    const selectedType = await stagehand.extract('the currently selected contract type')

    expect(selectedType).toContain('MSA')
  }, 30000)

  test('can fill MSA contract form', async () => {
    const page = stagehand.page

    await page.goto(`${baseURL}/contracts`)

    await stagehand.act('select MSA contract type')
    await page.waitForTimeout(500)

    // Fill form with natural language
    await stagehand.act('fill in the client name with Acme Corporation')
    await stagehand.act('select Singapore as the jurisdiction')

    await page.waitForTimeout(1000)

    // Verify form is filled
    const clientName = await stagehand.extract('the client name entered in the form')

    expect(clientName).toContain('Acme')
  }, 30000)

  test('can generate SOW with AI scope drafting', async () => {
    const page = stagehand.page

    await page.goto(`${baseURL}/contracts`)

    // Switch to SOW
    await stagehand.act('select SOW or Statement of Work contract type')

    await page.waitForTimeout(1000)

    // Fill in required fields
    await stagehand.act('fill in client name with Test Corp')
    await stagehand.act('fill in project name with Digital Transformation')
    await stagehand.act('enter scope bullets: Build web app, Train users, Deploy to production')

    await page.waitForTimeout(500)

    // Use AI drafting
    await stagehand.act('click the button to generate AI scope draft')

    // Wait for AI generation (may take time)
    await page.waitForTimeout(15000)

    // Extract generated scope
    const aiScope = await stagehand.extract('the AI generated scope text')

    expect(aiScope).toBeTruthy()
    expect(aiScope.length).toBeGreaterThan(50)
  }, 60000)

  test('can switch between contract types', async () => {
    const page = stagehand.page

    await page.goto(`${baseURL}/contracts`)

    // Switch through different types
    await stagehand.act('select MSA')
    await page.waitForTimeout(500)

    await stagehand.act('select SOW')
    await page.waitForTimeout(500)

    await stagehand.act('select Short Form Agreement')
    await page.waitForTimeout(500)

    // Verify Short Form is selected
    const currentType = await stagehand.extract('the current contract type selected')

    expect(currentType.toLowerCase()).toMatch(/short|form/)
  }, 30000)

  test('can view contract history or templates', async () => {
    const page = stagehand.page

    await page.goto(`${baseURL}/contracts`)

    // Try to access history
    await stagehand.act('find and click contract history or recent contracts if available')

    await page.waitForTimeout(2000)

    // Extract any history info
    const historyInfo = await stagehand.extract('contract history or list of contracts')

    expect(historyInfo).toBeTruthy()
  }, 30000)
})
