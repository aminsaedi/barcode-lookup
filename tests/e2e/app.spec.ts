import { test, expect, type Page } from '@playwright/test'

// ---------- Helpers ----------
async function mockLookupApi(page: Page, response: object) {
  await page.route('/api/lookup*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    }),
  )
}

// ---------- Tests ----------
test.describe('App shell', () => {
  test('loads with the Scan tab and shows scan button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('scan-button')).toBeVisible()
  })

  test('displays English app name', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toContainText('Quarantine')
  })

  test('has language switcher with EN and FA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('language-switcher')).toBeVisible()
    await expect(page.getByTestId('lang-en')).toBeVisible()
    await expect(page.getByTestId('lang-fa')).toBeVisible()
  })

  test('has three primary tabs', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('tab-scan')).toBeVisible()
    await expect(page.getByTestId('tab-browse')).toBeVisible()
    await expect(page.getByTestId('tab-about')).toBeVisible()
  })
})

test.describe('Language switching', () => {
  test('switches to Persian (FA) and applies RTL direction', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-fa').click()

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa')

    await expect(page.locator('h1').first()).toContainText('قرنطینه')
  })

  test('switches back to English (LTR)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-fa').click()
    await page.getByTestId('lang-en').click()

    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
    await expect(page.locator('h1').first()).toContainText('Quarantine')
  })

  test('language preference is remembered across reloads', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('lang-fa').click()
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  })
})

test.describe('Browse tab', () => {
  test('shows companies', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('tab-browse').click()
    await expect(page.getByTestId('browse-view')).toBeVisible()
    await expect(page.getByTestId('browse-search')).toBeVisible()
    // At least one company card should render
    const cards = page.getByTestId('company-card')
    expect(await cards.count()).toBeGreaterThan(0)
  })

  test('search narrows the list', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('tab-browse').click()
    await page.getByTestId('browse-search').fill('Nestlé')
    // Nestle should be visible, Apple should not
    await expect(
      page.locator('[data-company-slug="nestle"]'),
    ).toBeVisible()
    await expect(
      page.locator('[data-company-slug="apple"]'),
    ).toHaveCount(0)
  })

  test('category chip filters results', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('tab-browse').click()
    // Tag id 25 = "Drinking water". Scroll into the horizontally-scrollable
    // chip strip before clicking so the chip is in view.
    const chip = page.getByTestId('chip-25')
    await chip.scrollIntoViewIfNeeded()
    await chip.click()
    const cards = page.getByTestId('company-card')
    expect(await cards.count()).toBeGreaterThan(0)
    // Apple (electronics) should not appear under Drinking water
    await expect(page.locator('[data-company-slug="apple"]')).toHaveCount(0)
  })
})

test.describe('About tab', () => {
  test('renders attribution + links', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('tab-about').click()
    await expect(page.getByTestId('about-view')).toBeVisible()
    // Multiple qlist.ir links (button + footer); just confirm at least one is visible.
    await expect(page.getByRole('link', { name: /qlist\.ir/ }).first()).toBeVisible()
  })
})

test.describe('Manual barcode entry', () => {
  test.beforeEach(async ({ page }) => {
    await mockLookupApi(page, {
      barcode: '5449000000996',
      found: true,
      off: { name: 'Coca-Cola', productName: 'Coca-Cola Classic 330ml' },
    })
  })

  test('manual entry triggers lookup and shows company card', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('manual-button').click()
    await page.getByTestId('manual-form').getByRole('textbox').fill('5449000000996')
    await page.getByRole('button', { name: /Look up/i }).click()
    await expect(page.getByTestId('scan-result')).toBeVisible()
    // OFF returned "Coca-Cola" — should map to the cocacola company
    await expect(page.locator('[data-company-slug="cocacola"]')).toBeVisible()
  })
})

test.describe('Product lookup API mocking', () => {
  test('unknown barcode renders the no-flag card', async ({ page }) => {
    await mockLookupApi(page, { barcode: '9999999999999', found: false })
    await page.goto('/')
    await page.getByTestId('manual-button').click()
    await page.getByTestId('manual-form').getByRole('textbox').fill('9999999999999')
    await page.getByRole('button', { name: /Look up/i }).click()
    await expect(page.getByTestId('no-flag-card')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('language buttons have aria-pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('lang-en')).toHaveAttribute('aria-pressed')
  })

  test('tab buttons have aria-pressed', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('tab-scan')).toHaveAttribute('aria-pressed')
  })
})

test.describe('PWA manifest', () => {
  test('manifest is reachable and identifies the rebranded app', async ({ page }) => {
    const res = await page.request.get('/manifest.webmanifest')
    expect(res.status()).toBe(200)
    const manifest = await res.json()
    expect(manifest.name).toContain('Quarantine')
    expect(manifest.display).toBe('standalone')
  })
})
