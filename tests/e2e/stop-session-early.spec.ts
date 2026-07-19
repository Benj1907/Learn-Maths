import { test, expect, type Page } from '@playwright/test'
import { E2E_CHILD_EMAIL, E2E_CHILD_PASSWORD } from './test-user'

// Covers issue #14's Gherkin acceptance criteria: "Stop an active session early".
// The "Arrêter" control does not exist in the app yet — scenarios 1-3 are expected
// to FAIL until story-developer adds it. Scenario 4 is a regression guard for the
// existing "time's up" / "Terminer" path and is expected to PASS.
test.describe('Stop an active session early', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', E2E_CHILD_EMAIL)
    await page.fill('#password', E2E_CHILD_PASSWORD)
    await page.click('button[type=submit]')
    await page.waitForURL('**/child')
  })

  // Starts a session with time remaining by picking a class then a duration.
  // Leaves the page on /child (topic list) with a running countdown.
  async function startSession(page: Page, grade: string, duration: string) {
    await page.getByRole('button', { name: grade, exact: true }).click()
    await page.getByRole('button', { name: duration }).click()
    await expect(page.getByText('restantes')).toBeVisible()
  }

  test('shows a stop control on the topic list while the timer is still running', async ({ page }) => {
    await startSession(page, 'CE2', '10 min')

    // Stop affordance is present and separate from the countdown text.
    await expect(page.getByText('restantes')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible()

    // We are still in the running state, NOT the time-up / "Terminer" branch.
    await expect(page.getByRole('button', { name: 'Terminer' })).toHaveCount(0)
  })

  test('shows the stop control on an exercise page too', async ({ page }) => {
    await startSession(page, 'CE2', '10 min')

    // SessionTimerBar is sticky and mounts on exercise pages as well.
    await page.getByText('Divisions décimales').click()
    await expect(page.getByText('restantes')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible()
  })

  test('stopping ends the session immediately with one tap and no confirmation', async ({ page }) => {
    await startSession(page, 'CM1', '10 min')

    // Fail if a native confirm/alert dialog is raised — the stop must be one-tap.
    let dialogAppeared = false
    page.on('dialog', (dialog) => {
      dialogAppeared = true
      dialog.dismiss().catch(() => {})
    })

    // Single click, no extra confirmation step: we land back on the child home
    // grade picker even though time was still left on the clock.
    await page.getByRole('button', { name: 'Arrêter' }).click()
    await expect(page.getByText('Dans quelle classe es-tu ?')).toBeVisible()
    expect(dialogAppeared).toBe(false)
  })

  test('stopping from an exercise page returns to the child home screen', async ({ page }) => {
    await startSession(page, 'CE2', '10 min')
    await page.getByText('Divisions décimales').click()
    await expect(page.getByRole('button', { name: 'Arrêter' })).toBeVisible()

    // Triggered off an exercise page, the redirect to /child is observable.
    await page.getByRole('button', { name: 'Arrêter' }).click()
    await page.waitForURL('**/child')
    await expect(page.getByText('Dans quelle classe es-tu ?')).toBeVisible()
  })

  test('stopping early re-prompts for class and duration on the next visit', async ({ page }) => {
    await startSession(page, 'CE1', '10 min')
    await page.getByRole('button', { name: 'Arrêter' }).click()

    // Same re-prompt flow as after a session ends normally: class first,
    // then the duration picker once a class is chosen.
    await expect(page.getByText('Dans quelle classe es-tu ?')).toBeVisible()
    await page.getByRole('button', { name: 'CE1', exact: true }).click()
    await expect(page.getByText('Combien de temps')).toBeVisible()

    // Secondary: the session storage keys were actually cleared by endSession().
    const endAt = await page.evaluate(() => sessionStorage.getItem('session-end-at'))
    expect(endAt).toBeNull()
  })

  // Regression guard — expected to PASS pre-implementation. The existing
  // end-of-time path must stay unchanged when the new stop control is added.
  test('the existing "time\'s up" Terminer path is unaffected', async ({ page }) => {
    await startSession(page, 'CM1', '10 min')

    // Force the timer expired so SessionTimerBar renders the time-up branch.
    await page.evaluate(() => sessionStorage.setItem('session-end-at', String(Date.now() - 1000)))
    await page.reload()

    await expect(page.getByText('Temps écoulé ! Tu peux t\'arrêter quand tu veux.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Terminer' })).toBeVisible()
  })
})
