import { test, expect } from '@playwright/test'
import { E2E_CHILD_EMAIL, E2E_CHILD_PASSWORD } from './test-user'

// Covers issue #7's Gherkin acceptance criteria.
test.describe('Grade selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', E2E_CHILD_EMAIL)
    await page.fill('#password', E2E_CHILD_PASSWORD)
    await page.click('button[type=submit]')
    await page.waitForURL('**/child')
  })

  test('prompts for a class before the duration picker', async ({ page }) => {
    await expect(page.getByText('Dans quelle classe es-tu ?')).toBeVisible()
    await expect(page.getByRole('button', { name: 'CE1', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '6ème', exact: true })).toBeVisible()
    await expect(page.getByText('Combien de temps')).toHaveCount(0)
  })

  test('shows the duration picker only after a class is selected', async ({ page }) => {
    await page.getByRole('button', { name: 'CE1', exact: true }).click()
    await expect(page.getByText('Combien de temps veux-tu')).toBeVisible()
    await expect(page.getByText('Dans quelle classe')).toHaveCount(0)
  })

  test('grade persists across topic switches and is not re-asked mid-session', async ({ page }) => {
    await page.getByRole('button', { name: 'CE2', exact: true }).click()
    await page.getByRole('button', { name: '10 min' }).click()
    await expect(page.getByText('restantes')).toBeVisible()

    const gradeAfterStart = await page.evaluate(() => sessionStorage.getItem('session-grade'))
    expect(gradeAfterStart).toBe('CE2')

    await page.getByText('Divisions décimales').click()
    await page.goto('/child')
    await expect(page.getByText('Dans quelle classe')).toHaveCount(0)
    await expect(page.getByText('Combien de temps')).toHaveCount(0)

    const gradeAfterSwitch = await page.evaluate(() => sessionStorage.getItem('session-grade'))
    expect(gradeAfterSwitch).toBe('CE2')
  })

  test('ending the session resets to the grade picker', async ({ page }) => {
    await page.getByRole('button', { name: 'CM1', exact: true }).click()
    await page.getByText('5 min', { exact: true }).click()

    // Force the timer expired so SessionTimerBar renders the real "Terminer"
    // button, then click it — exercises the actual endSession() call rather
    // than simulating its effect.
    await page.evaluate(() => sessionStorage.setItem('session-end-at', String(Date.now() - 1000)))
    await page.reload()
    await page.getByRole('button', { name: 'Terminer' }).click()

    await expect(page.getByText('Dans quelle classe es-tu ?')).toBeVisible()
  })
})
