#!/usr/bin/env node
// PreToolUse hook for story-developer (Write|Edit): blocks any write to the
// protected Playwright baseline. The developer subagent owns application
// code only — acceptance tests belong to playwright-test-designer.
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

  if (isProtectedPath(filePath, repoRoot)) {
    const rel = path.relative(repoRoot, path.resolve(repoRoot, filePath))
    process.stderr.write(
      `Blocked: "${rel}" is a protected Playwright acceptance-test file. Playwright tests are ` +
        `owned by the independent test-design process, not the developer subagent. If this test ` +
        `is genuinely wrong, stop and ask Benjamin for explicit approval before changing it.\n`
    )
    process.exit(2)
  }

  process.exit(0)
})
