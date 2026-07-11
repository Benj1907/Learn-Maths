import { defineConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^([^=#]+)=(.*)$/)
    if (match) process.env[match[1].trim()] ??= match[2].trim()
  }
}
loadEnvLocal()

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  use: {
    baseURL: 'http://localhost:3000',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})
