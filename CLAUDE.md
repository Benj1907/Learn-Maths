@AGENTS.md

## GitHub Issue Workflow

- GitHub issues are the source of truth for requirements, scope, and acceptance criteria.
- Whenever Benjamin asks to work on, start, develop, or implement a GitHub issue and gives an issue number, automatically invoke the `implement-story` skill with that issue number — he should never need to type `/implement-story` explicitly.
- One GitHub issue = one dedicated Git branch. Never implement directly on the default branch.
- Keep changes focused on the selected issue.
- Acceptance criteria must be converted into Playwright tests before implementation whenever they can reasonably be automated.
- Playwright test design and application development must be delegated to separate subagents (`playwright-test-designer` and `story-developer`) — never done by the same subagent or in the main thread.
- The developer subagent must never create, edit, delete, rename, regenerate, or approve Playwright tests, and must not modify Playwright configuration, fixtures, snapshots, stored test data, or expected results. Only the test designer may create or intentionally update acceptance tests.
- Once the Playwright test baseline is recorded, those files are protected for the remainder of the story. Changing an acceptance test after implementation begins requires Benjamin's explicit approval.
- A separate read-only subagent (`playwright-runner`) must execute the protected tests. A failing Playwright test must normally cause the application code to be corrected, not the test.
- Claude must report any attempted or detected modification of protected test files — a subagent's claim that it didn't touch them is not sufficient; verify with Git.
- Advisor code review must occur before final Playwright execution.
- Run the relevant automated checks (type checking, linting, unit/integration tests, build) alongside Playwright.
- Local acceptance by Benjamin remains mandatory before merge, deployment, issue closure, or moving the issue to Done. Never claim a test or quality check passed unless it actually ran successfully.

The full procedure lives in `.claude/skills/implement-story/SKILL.md`.
