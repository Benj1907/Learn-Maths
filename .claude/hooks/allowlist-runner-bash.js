#!/usr/bin/env node
// PreToolUse hook for playwright-runner (Bash): allowlist-only. This
// subagent has no Write/Edit tool at all; this hook additionally locks its
// Bash access down to inspecting the environment, starting/stopping the
// local app, running Playwright, reading Playwright output, and reading Git
// status/diff. Everything else is blocked by default.
'use strict'

const FORBIDDEN_SUBSTRINGS = ['--update-snapshots', '`', '$(']

// Anchored so trailing shell-smuggled content doesn't slip through; each
// pattern allows a command plus arbitrary flags/args after it.
const ALLOWLIST = [
  /^git\s+status(\s.*)?$/,
  /^git\s+diff(\s.*)?$/,
  /^git\s+log(\s.*)?$/,
  /^git\s+branch(\s+--show-current)?\s*$/,
  /^ls(\s.*)?$/,
  /^pwd\s*$/,
  /^cat\s+[^|>]*$/,
  /^echo\s+[^|>]*$/,
  /^ps(\s.*)?$/,
  /^lsof(\s.*)?$/,
  /^node\s+(-v|--version)\s*$/,
  /^npm\s+(-v|--version)\s*$/,
  /^npm\s+run\s+dev(\s.*)?$/,
  /^npm\s+run\s+start(\s.*)?$/,
  /^npx\s+playwright\s+test(\s.*)?$/,
  /^npx\s+playwright\s+show-report(\s.*)?$/,
  /^curl\s+-s.*localhost.*$/,
  /^pkill\s+-f\s+["']?next dev["']?\s*$/,
]

function isAllowedSegment(segment) {
  const trimmed = segment.trim()
  if (!trimmed) return true
  if (FORBIDDEN_SUBSTRINGS.some((forbidden) => trimmed.includes(forbidden))) return false
  return ALLOWLIST.some((pattern) => pattern.test(trimmed))
}

// Split on shell chaining operators so an allowed prefix can't smuggle a
// disallowed command after `&&`, `;`, `|`, or `||`.
function isAllowedCommand(command) {
  if (FORBIDDEN_SUBSTRINGS.some((forbidden) => command.includes(forbidden))) return false
  const segments = command.split(/&&|\|\||;|\|/)
  return segments.every(isAllowedSegment)
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

  if (!isAllowedCommand(command)) {
    process.stderr.write(
      'Blocked: playwright-runner is restricted to an allowlist (environment inspection, starting/' +
        'stopping the local app, running Playwright, reading Playwright output, and read-only Git ' +
        'status/diff). This command is not on that allowlist. Generated artifacts (reports, ' +
        'screenshots, videos, traces) are fine — modifying test definitions or expected results is not.\n'
    )
    process.exit(2)
  }

  process.exit(0)
})
