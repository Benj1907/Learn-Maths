#!/usr/bin/env node
// PreToolUse hook for playwright-test-designer (Write|Edit): this subagent's
// whole job is the acceptance-test baseline, so it may only touch Playwright
// paths. Blocks any attempt to write application source.
'use strict'

const path = require('path')
const { findRepoRoot, isProtectedPath } = require('./lib/playwright-paths')

let raw = ''
process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk) => {
  raw += chunk
})
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  const toolName = input.tool_name
  const toolInput = input.tool_input || {}
  if (toolName !== 'Write' && toolName !== 'Edit') process.exit(0)

  const filePath = toolInput.file_path
  if (!filePath) process.exit(0)

  const repoRoot = findRepoRoot(input.cwd || process.cwd())

  if (!isProtectedPath(filePath, repoRoot)) {
    const rel = path.relative(repoRoot, path.resolve(repoRoot, filePath))
    process.stderr.write(
      `Blocked: playwright-test-designer may only create or update Playwright test files ` +
        `(the project's testDir and playwright.config.*). "${rel}" is application source, ` +
        `which is out of scope for this subagent — hand implementation to story-developer instead.\n`
    )
    process.exit(2)
  }

  process.exit(0)
})
