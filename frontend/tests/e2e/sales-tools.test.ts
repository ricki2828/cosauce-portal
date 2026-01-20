/**
 * CoSauce Portal - Sales Tools Tests (Stagehand)
 *
 * Tests for sales tools and CRM functionality.
 */
import { Stagehand } from '@browserbasehq/stagehand'
import { expect } from '@jest/globals'

describe('Sales Tools', () => {
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

  test('can navigate to sales tools', async () => {
    const page = stagehand.page

    await page.goto(baseURL)

    // Navigate using natural language
    await stagehand.act('navigate to sales tools or sales section')

    await page.waitForTimeout(2000)

    const pageContent = await stagehand.extract('the main content or heading')

    expect(pageContent.toLowerCase()).toMatch(/sales|tools|crm/)
  }, 30000)

  test('can access proposals section', async () => {
    const page = stagehand.page

    await page.goto(baseURL)

    await stagehand.act('go to proposals or view proposals')

    await page.waitForTimeout(2000)

    const proposalsInfo = await stagehand.extract('proposal information or list')

    expect(proposalsInfo).toBeTruthy()
  }, 30000)

  test('can access quotes section', async () => {
    const page = stagehand.page

    await page.goto(baseURL)

    await stagehand.act('navigate to quotes or pricing')

    await page.waitForTimeout(2000)

    const quotesInfo = await stagehand.extract('quotes or pricing information')

    expect(quotesInfo).toBeTruthy()
  }, 30000)

  test('can view analytics dashboard', async () => {
    const page = stagehand.page

    await page.goto(baseURL)

    await stagehand.act('go to analytics or dashboard')

    await page.waitForTimeout(2000)

    const analyticsData = await stagehand.extract('analytics metrics or statistics')

    expect(analyticsData).toBeTruthy()
  }, 30000)
})
