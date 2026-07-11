#!/usr/bin/env node
// Shared helper for the Playwright-protection hooks: discovers this repo's
// actual Playwright locations (config + testDir) instead of assuming fixed
// paths, so protection keeps working if the project restructures.
'use strict'

const fs = require('fs')
const path = require('path')

const PLAYWRIGHT_CONFIG_NAMES = [
  'playwright.config.ts',
  'playwright.config.js',
  'playwright.config.mjs',
  'playwright.config.cts',
  'playwright.config.mts',
]

// Extra directory names that count as protected wherever they appear, so
// snapshot/fixture folders are covered even when they live outside testDir.
const PROTECTED_DIR_NAME_PATTERN = /^(e2e|playwright|__screenshots__|__snapshots__)$|-snapshots$/i

function findRepoRoot(startDir) {
  let dir = path.resolve(startDir)
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return path.resolve(startDir)
    dir = parent
  }
}

function findPlaywrightConfig(repoRoot) {
  for (const name of PLAYWRIGHT_CONFIG_NAMES) {
    const candidate = path.join(repoRoot, name)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function extractTestDir(configPath) {
  if (!configPath) return null
  const text = fs.readFileSync(configPath, 'utf8')
  const match = text.match(/testDir\s*:\s*['"]([^'"]+)['"]/)
  return match ? match[1] : null
}

// Returns the set of protected roots (absolute paths): the Playwright config
// file itself, and the resolved testDir it declares (falling back to the
// conventional ./tests/e2e if testDir isn't found).
function getProtectedRoots(repoRoot) {
  const configPath = findPlaywrightConfig(repoRoot)
  const testDirRel = extractTestDir(configPath) || './tests/e2e'
  const testDirAbs = path.resolve(repoRoot, testDirRel)
  const roots = [testDirAbs]
  if (configPath) roots.push(configPath)
  return { roots, configPath, testDirAbs }
}

function isUnderRoot(absTarget, absRoot) {
  const rel = path.relative(absRoot, absTarget)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

// Normalized comparison (path.relative), not substring matching, so
// "tests/e2e-archive" doesn't falsely match protected "tests/e2e".
function isProtectedPath(targetPath, repoRoot) {
  const abs = path.isAbsolute(targetPath) ? targetPath : path.resolve(repoRoot, targetPath)
  const { roots } = getProtectedRoots(repoRoot)
  if (roots.some((root) => isUnderRoot(abs, root))) return true

  const relFromRepo = path.relative(repoRoot, abs)
  if (relFromRepo.startsWith('..')) return false
  return relFromRepo.split(path.sep).some((segment) => PROTECTED_DIR_NAME_PATTERN.test(segment))
}

function getProtectedRelativePaths(repoRoot) {
  const { roots } = getProtectedRoots(repoRoot)
  return roots.map((root) => path.relative(repoRoot, root).split(path.sep).join('/'))
}

module.exports = {
  findRepoRoot,
  findPlaywrightConfig,
  getProtectedRoots,
  isProtectedPath,
  getProtectedRelativePaths,
}

if (require.main === module) {
  const repoRoot = findRepoRoot(process.cwd())
  console.log(JSON.stringify(getProtectedRelativePaths(repoRoot), null, 2))
}
