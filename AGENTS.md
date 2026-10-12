# Agent Plugins contributor guide

This repository owns reusable plugin content under `plugins/`. The AllAgents CLI, client adapters and workspace examples belong in `allagentsdev/allagents`.

- Work on a dedicated branch/worktree from current `origin/main`; publish changes through a pull request. Never push implementation directly to `main` or merge without user authorization. Use conventional commit and PR titles; squash merges.
- Keep `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json` aligned for the complete catalogue. Both use the marketplace name `agent-plugins` and local paths to plugin directories.
- Preserve plugin names, licensing, attribution, executable file modes and supporting resources. Update plugin homepages and local links when moving files.
- Keep skills scoped to reusable capabilities. Keep household data, private service configuration, credentials and downloaded personal workbooks in their private repositories.
- Read a skill and its supporting instructions before changing its behavior. Prefer concise instructions with examples and references for detail; preserve calculation and missing-data semantics when changing financial guidance.
- Use Bun for scripts and tests. Run `bun run validate` and `bun test` before publishing. For changed installation or runtime behavior, exercise the relevant built CLI or script in a temporary fixture and document the result.
- Use independent review for substantial changes; resolve correctness and ownership findings before publication. Record meaningful checks and limitations in the PR description.
- Maintain an explicit task list for work with five or more steps. Stage exact file paths and preserve unrelated edits. Never commit build outputs, dependency directories, runtime state or secrets.
