---
name: implement-story
description: Implement a numbered GitHub issue through branching, coding, Advisor review, Playwright testing, and local user acceptance. Use whenever Benjamin asks to work on, start, develop, or implement a GitHub issue.
when_to_use: Automatically use this skill when the user provides a GitHub issue number and asks to work on it.
argument-hint: "[issue-number]"
arguments:
  - issue
---

# Implement Story

Full workflow for turning GitHub issue `$issue` into a locally-verified change. GitHub is the source of truth — never invent requirements. Playwright test design and application development are split across independent subagents (`playwright-test-designer`, `story-developer`, `playwright-runner`) so the developer can never edit its own acceptance tests to make them pass. Follow every stage in order; do not skip Advisor review or independent Playwright execution, and never merge/close/deploy without Benjamin's explicit approval.

## Workflow integrity — verify at every handoff

A subagent's own claim that it didn't touch protected Playwright files is never sufficient. At every handoff between stages, you (the coordinator) must independently verify with Git:

- Which subagent just ran, and which files it actually touched (`git status`, `git diff --name-status`).
- Whether every changed file was permitted for that subagent's role.
- Whether the protected Playwright paths still match `PLAYWRIGHT_BASELINE_COMMIT` (`git diff --name-status $PLAYWRIGHT_BASELINE_COMMIT -- <protected paths>` — empty output means untouched).

If a protected file changed outside stage B, that's a workflow violation: stop, report it to Benjamin, and do not silently restore or accept it.

## Stage A: Analyse the issue

1. Confirm `$issue` was supplied — if not, ask for an issue number before doing anything else.
2. Verify GitHub CLI auth: `gh auth status`.
3. Fetch the issue: `gh issue view $issue --json title,body,state,labels,url`.
4. Confirm it exists and is open (if closed, tell Benjamin and confirm he still wants to proceed).
5. Treat the issue body as the source of truth. Extract and summarize: user need, business objective, scope, acceptance criteria, constraints. Do not invent requirements beyond what's written.
6. Identify which acceptance criteria are automatable through the UI (Playwright) and which require manual testing.
7. Inspect the relevant existing code for the area the issue touches. Present a concise implementation plan and wait before doing anything else.
8. Check Git: confirm this is the right repo (`git rev-parse --show-toplevel`), run `git status` (never overwrite unrelated uncommitted work — stash or pause and ask), identify the default branch, `git fetch origin`, fast-forward-only pull (`git pull --ff-only`).
9. Create and switch to `story/$issue-<short-kebab-case-title>`. Never implement directly on the default branch.

## Stage B: Design acceptance tests first

Do not allow application implementation during this stage.

1. Delegate only acceptance-test creation to `playwright-test-designer`, giving it the issue and the acceptance criteria from Stage A (not application code that doesn't exist yet).
2. Review its summary: tests created, criteria covered, criteria left for manual testing, expected pre-implementation failures.
3. Run the new tests yourself and record the pre-implementation result (they should fail for the missing behavior — that confirms they're actually exercising it).
4. Record the repo's actual protected Playwright paths: `node .claude/hooks/lib/playwright-paths.js`.
5. Commit the acceptance-test baseline in its own commit: `test(issue #$issue): add acceptance tests`.
6. Record the resulting commit SHA as `PLAYWRIGHT_BASELINE_COMMIT`.

When an acceptance criterion can't reasonably be automated, record the reason and add it to the manual acceptance checklist instead.

From here on, the tests are protected for the rest of the story. Changing one requires Benjamin's explicit approval (see integrity rule above).

## Stage C: Implement with the developer

1. Delegate application implementation to `story-developer`, giving it: the issue, the acceptance criteria, relevant code context, and the test-designer's summary. Do not give it authority over Playwright files — it doesn't need any; its hooks block it structurally.
2. After it returns, run the integrity check: `git status`, `git diff --name-status`, and diff the protected paths against `PLAYWRIGHT_BASELINE_COMMIT`. If any protected file changed, stop and report the violation to Benjamin — do not restore it yourself or continue silently.

## Stage D: Development checks

Detect and run whatever the project has configured, where available: type checking, linting, formatting validation, unit tests, integration tests, build verification. Fix failures caused by this implementation (via `story-developer`).

Report each check as exactly one of: **passed**, **failed**, **unavailable**, or **not run** (with reason). Never report a check as passed unless its command actually completed successfully.

## Stage E: Advisor review

Ask Advisor to review, together: issue `#$issue` and its acceptance criteria, the protected acceptance tests, the current application-code diff, and the Stage D results.

Advisor must assess: correctness, completeness, regressions, security, error handling, accessibility, maintainability, unnecessary complexity, and missing tests. Advisor must not suggest weakening an acceptance test merely because the implementation currently fails it. Classify each finding as **Blocker**, **Major**, **Minor**, or **Suggestion**.

- Resolve all Blocker and Major findings through `story-developer`.
- Resolve Minor findings when reasonably possible within scope; explain any left unresolved.
- After corrections, re-run the integrity check (protected files still match `PLAYWRIGHT_BASELINE_COMMIT`).
- If substantial changes follow the review, request another Advisor pass.
- If Advisor is unavailable, stop and tell Benjamin this mandatory quality gate could not be completed — do not silently skip it.

## Stage F: Independent Playwright execution

Delegate execution only to `playwright-runner` — never to `story-developer`, and never run it yourself in place of the runner. The runner is read-only and must not fix failures.

When Playwright fails:

1. Preserve the failing test and its evidence (report, trace, screenshot) — do not touch the test.
2. Return the failure report to yourself as coordinator.
3. Delegate application-code correction to `story-developer`.
4. Re-run the integrity check (protected files still match `PLAYWRIGHT_BASELINE_COMMIT`).
5. Ask Advisor for another review if the correction was substantial.
6. Invoke `playwright-runner` again.

Never ask `story-developer` (or anyone) to edit a Playwright test to make a failure disappear. Never claim Playwright passed unless the runner's command actually completed successfully.

## Stage G: Local acceptance — then stop

Do not deploy to production. Once the protected Playwright tests pass and all available quality gates are done, present:

- Issue number and title, the branch name, and the Playwright baseline commit (`PLAYWRIGHT_BASELINE_COMMIT`).
- Summary of the implementation and the principal application files changed.
- The protected test files (unchanged from baseline).
- Result of each Stage D check.
- Advisor findings and how each was resolved.
- Playwright results, including anything left for manual testing.
- The exact command to start the local app, and the local URL.
- A manual acceptance-testing checklist derived from the issue's acceptance criteria.

Then ask Benjamin to test locally and reply **Approved** or with the problems found. Stop here.

Until he explicitly approves: do not deploy, merge, close the issue, move it to Done, or delete the branch. Do not push the branch or open a PR unless he explicitly asks for it.
