import { test, expect } from '@playwright/test'

/**
 * CoSauce Portal - Contract Generator E2E Tests
 *
 * Critical user flows for contract generation:
 * 1. Display contract templates
 * 2. Generate MSA contract
 * 3. Show validation errors
 * 4. AI scope drafting
 */

test.describe('Contract Generator', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to contracts page
    await page.goto('/contracts')
    await expect(page).toHaveURL(/.*contracts/)
  })

  test('displays all contract templates (MSA, SOW, ShortForm)', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: 'Contract Generator' })).toBeVisible()
    await expect(page.getByText('Generate professional contracts with AI assistance')).toBeVisible()

    // Verify all 3 contract type buttons are visible
    await expect(page.getByText('Master Services Agreement')).toBeVisible()
    await expect(page.getByText('Standard MSA for ongoing client relationships')).toBeVisible()

    await expect(page.getByText('Statement of Work')).toBeVisible()
    await expect(page.getByText('Project-specific scope, deliverables, and terms')).toBeVisible()

    await expect(page.getByText('Short Form Agreement')).toBeVisible()
    await expect(page.getByText('Simplified contract for smaller engagements')).toBeVisible()

    // Verify MSA is selected by default
    const msaButton = page.getByText('Master Services Agreement').locator('..')
    await expect(msaButton).toHaveClass(/border-blue-500/)
  })

  test('generates MSA contract with valid data', async ({ page }) => {
    // MSA should be selected by default
    await expect(page.getByText('Master Services Agreement').locator('..')).toHaveClass(/border-blue-500/)

    // Fill in client name
    const clientNameInput = page.getByPlaceholder('e.g., Acme Corporation')
    await clientNameInput.fill('Test Client Corp')

    // Select jurisdiction
    const jurisdictionSelect = page.locator('select').filter({ hasText: 'Singapore' })
    await jurisdictionSelect.selectOption('New Zealand')

    // Verify form fields are filled
    await expect(clientNameInput).toHaveValue('Test Client Corp')
    await expect(jurisdictionSelect).toHaveValue('New Zealand')

    // Listen for download event
    const downloadPromise = page.waitForEvent('download')

    // Click generate button
    const generateButton = page.getByRole('button', { name: /Generate & Download Contract/ })
    await expect(generateButton).toBeEnabled()
    await generateButton.click()

    // Verify download starts (button shows loading state)
    await expect(generateButton).toHaveText(/Generating.../)
    await expect(generateButton).toBeDisabled()

    // Wait for download to complete
    const download = await downloadPromise
    const fileName = download.suggestedFilename()

    // Verify downloaded file name format
    expect(fileName).toMatch(/^MSA_Test_Client_Corp\.docx$/)

    // Verify button returns to normal state
    await expect(generateButton).toHaveText(/Generate & Download Contract/)
    await expect(generateButton).toBeEnabled()
  })

  test('shows validation error when client name is empty', async ({ page }) => {
    // Ensure client name is empty
    const clientNameInput = page.getByPlaceholder('e.g., Acme Corporation')
    await expect(clientNameInput).toHaveValue('')

    // Generate button should be disabled when client name is empty
    const generateButton = page.getByRole('button', { name: /Generate & Download Contract/ })
    await expect(generateButton).toBeDisabled()

    // Try to click (should not do anything since disabled)
    await generateButton.click({ force: true })

    // Verify alert appears
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Please enter client name')
      await dialog.accept()
    })

    // Verify no download occurs
    let downloadOccurred = false
    page.on('download', () => {
      downloadOccurred = true
    })

    // Wait a moment to ensure no download
    await page.waitForTimeout(1000)
    expect(downloadOccurred).toBe(false)
  })

  test('AI scope drafting works for SOW contract', async ({ page }) => {
    // Switch to SOW contract type
    const sowButton = page.getByText('Statement of Work').locator('..')
    await sowButton.click()

    // Verify SOW is now selected
    await expect(sowButton).toHaveClass(/border-blue-500/)

    // Verify AI Scope Drafting section is visible
    await expect(page.getByText('AI Scope Drafting')).toBeVisible()
    await expect(page.getByRole('button', { name: /Generate Draft/ })).toBeVisible()

    // Fill in project name (required for AI draft)
    const projectNameInput = page.getByPlaceholder('e.g., Digital Transformation Initiative')
    await projectNameInput.fill('Customer Portal Development')

    // Fill in scope bullets
    const scopeBulletsTextarea = page.getByPlaceholder(/Enter bullet points for scope/)
    await scopeBulletsTextarea.fill(
      '- Build customer portal with React\n- Integrate with Salesforce CRM\n- Training for 20 users'
    )

    // Click "Generate Draft" button
    const generateDraftButton = page.getByRole('button', { name: /Generate Draft/ })
    await generateDraftButton.click()

    // Verify loading state
    await expect(generateDraftButton).toHaveText(/Drafting.../)
    await expect(generateDraftButton).toBeDisabled()

    // Wait for AI draft to appear (timeout 30s for API call)
    await expect(page.getByText('AI Generated Draft:')).toBeVisible({ timeout: 30000 })

    // Verify draft content is not empty
    const aiDraftSection = page.locator('text=AI Generated Draft:').locator('..')
    const draftText = await aiDraftSection.locator('p').last().textContent()
    expect(draftText?.length).toBeGreaterThan(50) // AI should generate substantial text

    // Verify draft was copied to Scope of Work field
    const scopeOfWorkTextarea = page.getByPlaceholder('Detailed scope of work...')
    const scopeValue = await scopeOfWorkTextarea.inputValue()
    expect(scopeValue.length).toBeGreaterThan(50)
    expect(scopeValue).toBe(draftText)

    // Verify button returns to normal state
    await expect(generateDraftButton).toHaveText(/Generate Draft/)
    await expect(generateDraftButton).toBeEnabled()
  })

  test('AI scope drafting shows error when project name is missing', async ({ page }) => {
    // Switch to SOW contract type
    await page.getByText('Statement of Work').locator('..').click()

    // Fill ONLY scope bullets (missing project name)
    const scopeBulletsTextarea = page.getByPlaceholder(/Enter bullet points for scope/)
    await scopeBulletsTextarea.fill('- Build portal\n- Add features')

    // Set up dialog handler
    page.on('dialog', async dialog => {
      expect(dialog.message()).toBe('Please enter project name and scope bullets')
      await dialog.accept()
    })

    // Click "Generate Draft" button
    const generateDraftButton = page.getByRole('button', { name: /Generate Draft/ })
    await generateDraftButton.click()

    // Verify no AI draft appears
    await page.waitForTimeout(1000)
    await expect(page.getByText('AI Generated Draft:')).not.toBeVisible()
  })

  test('switches between contract types and shows correct fields', async ({ page }) => {
    // Start with MSA (default)
    await expect(page.getByText('Jurisdiction')).toBeVisible()
    await expect(page.getByPlaceholder('e.g., Digital Transformation Initiative')).not.toBeVisible()

    // Switch to SOW
    await page.getByText('Statement of Work').locator('..').click()

    // Verify SOW-specific fields appear
    await expect(page.getByPlaceholder('e.g., Digital Transformation Initiative')).toBeVisible()
    await expect(page.getByText('AI Scope Drafting')).toBeVisible()
    await expect(page.getByPlaceholder('Detailed scope of work...')).toBeVisible()
    await expect(page.getByPlaceholder('List of deliverables...')).toBeVisible()
    await expect(page.getByPlaceholder('e.g., 12 weeks')).toBeVisible()
    await expect(page.getByPlaceholder('e.g., Net 30')).toBeVisible()

    // Verify MSA-specific fields are hidden
    await expect(page.getByText('Jurisdiction')).not.toBeVisible()

    // Switch to Short Form
    await page.getByText('Short Form Agreement').locator('..').click()

    // Verify ShortForm-specific fields appear
    await expect(page.getByPlaceholder('e.g., Digital Transformation Initiative')).toBeVisible()
    await expect(page.getByText('AI Scope Drafting')).toBeVisible()
    await expect(page.getByPlaceholder('e.g., $25,000')).toBeVisible()

    // Verify SOW-only fields are hidden
    await expect(page.getByPlaceholder('List of deliverables...')).not.toBeVisible()
    await expect(page.getByPlaceholder('e.g., 12 weeks')).not.toBeVisible()
  })
})
