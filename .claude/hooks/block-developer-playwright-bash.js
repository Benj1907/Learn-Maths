#!/usr/bin/env node
// PreToolUse hook for story-developer (Bash): blocks shell commands that
// would modify, delete, rename, restore, regenerate, or overwrite the
// protected Playwright baseline (tests, config, fixtures, snapshots), and
// blocks Playwright snapshot-update runs outright.
//
// This is best-effort text matching over an arbitrary shell command string
// (there's no structured file_path to normalize the way Write/Edit has), so
// it uses word-boundary regex against the repo's actual protected paths
// rather than a naive substring check.
'use strict'

const path = require('path')
const { findRepoRoot, getProtectedRelativePaths } = require('./lib/playwright-paths')

const SNAPSHOT_UPDATE_PATTERN = /--update-snapshots\b/
const PLAYWRIGHT_SHORT_UPDATE_FLAG = /(^|\s)-u(\s|$)/

const DESTRUCTIVE_VERB_PATTERN =
  /\b(git\s+(checkout|restore|reset|clean|rebase|commit\s+--amend|push\s+--force(?:-with-lease)?|filter-branch|update-ref)|rm|mv|truncate|sed\s+-i|cp)\b/

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
  if (toolName !== 'Bash') process.exit(0)

  const command = toolInput.command || ''
  const lower = command.toLowerCase()

  if (SNAPSHOT_UPDATE_PATTERN.test(command) || (PLAYWRIGHT_SHORT_UPDATE_FLAG.test(command) && lower.includes('playwright'))) {
    process.stderr.write(
      'Blocked: this command would regenerate Playwright snapshots/expected results. Only ' +
        'playwright-test-designer may update the acceptance-test baseline.\n'
    )
    process.exit(2)
  }

  const repoRoot = findRepoRoot(input.cwd || process.cwd())
  const protectedTokens = getProtectedRelativePaths(repoRoot).filter(Boolean)

  const mentionsProtectedPath = protectedTokens.some((token) => {
    const escaped = escapeRegExp(token)
    return new RegExp(`(^|[\\s'"/])${escaped}([\\s'"/]|$)`).test(command)
  })

  if (DESTRUCTIVE_VERB_PATTERN.test(lower) && mentionsProtectedPath) {
    process.stderr.write(
      `Blocked: this command would modify, delete, rename, restore, or rewrite the protected ` +
        `Playwright baseline (${protectedTokens.join(', ')}). Playwright tests are owned by the ` +
        `independent test-design process — ask Benjamin for explicit approval if a test genuinely ` +
        `needs to change.\n`
    )
    process.exit(2)
  }

  process.exit(0)
})
