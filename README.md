# Agent Plugins

Reusable plugins for AI assistants, maintained by AllAgents. This repository is the plugin catalogue; the [AllAgents CLI and workspace examples](https://github.com/allagentsdev/allagents) remain in their own repository.

## Install

Install a plugin with AllAgents:

```sh
npx allagents plugin install finance@allagentsdev/agent-plugins --scope user
```

Select a project scope and clients when needed:

```sh
npx allagents plugin install engineering@allagentsdev/agent-plugins --scope project --client codex --yes
```

Claude Code and Copilot CLI can use this repository's native marketplace manifests. For other clients, AllAgents copies the supported plugin resources into each client's expected directories.

## Catalogue

| Plugin | Contents |
| --- | --- |
| [deepwiki](plugins/deepwiki) | Public repository documentation tools and guidance |
| [engineering](plugins/engineering) | Interactive PR review and read-only GitHub attention checks |
| [productivity](plugins/productivity) | Direct technical writing and behavioral evals |
| [finance](plugins/finance) | Financial modeling guidance and an original fictional XLSX example |
| [tradingview](plugins/tradingview) | TradingView market data MCP configuration |

The CLI-specific guidance plugin remains in [allagents/plugins/allagents](https://github.com/allagentsdev/allagents/tree/main/plugins/allagents), installed as `allagents@allagentsdev/allagents`.

Some plugins connect to external services; their availability and authentication are governed by those services. The catalogue contains reusable guidance and configurations, not personal credentials or records.

## GitHub attention

The engineering plugin includes [github-attention](plugins/engineering/skills/github-attention/SKILL.md). Give it an explicit list of repositories to check for current review requests, assigned issues, action on authored PRs, and notification-based mention/reply candidates. It uses your existing `gh` login and never acts on GitHub tasks.

Run the helper directly from this repository with Bun and `gh`; no package installation is needed:

```sh
bun plugins/engineering/skills/github-attention/scripts/github-attention.ts owner/repo
```

Save personal selections and private reports in `~/.agents/github-attention.md`, outside project repositories. When asked for a saved selection, the skill reads that note and resolves only explicitly recorded repository rules. The helper still requires repository arguments each time; it does not load a second configuration system. Keep private data out of the reusable skill and fixtures; repository-local temporary notes must be ignored, for example with `*.local.md`. Mention coverage is bounded by visible notifications, not a complete historical inbox.

## Workspace templates

Workspace templates remain under [allagents/examples/workspaces](https://github.com/allagentsdev/allagents/tree/main/examples/workspaces). They compose plugins from this catalogue and other sources:

```yaml
plugins:
  - finance@allagentsdev/agent-plugins
  - engineering@allagentsdev/agent-plugins
```

The companion AllAgents migration preserves the old marketplace declarations, such as `finance@allagentsdev/allagents`, through external sources. Direct old directory URLs for the moved plugins do not redirect: replace `allagentsdev/allagents/plugins/<name>` with `<name>@allagentsdev/agent-plugins`. Upgrade AllAgents before using the migrated forwarding marketplace. Pinned historical versions continue to use their original content.

## Development

Use Bun:

```sh
bun install
bun run validate
bun test
```

Run the [writing evals](evals/productivity/write-naturally/promptfooconfig.yaml):

```sh
bun run eval:validate
bun run eval:write-naturally
```

For deterministic punctuation checks, use `bun run eval:write-naturally --filter-metadata group=punctuation`.

Evals use fictional data and your Codex connection. Set `CODEX_MODEL` and `CODEX_JUDGE_MODEL` to change the writer and grader.

Compare the [Humanizer-inspired cases](https://github.com/blader/humanizer/blob/225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8/SKILL.md) with and without the skill:

```sh
bun run eval:write-naturally --filter-metadata group=humanizer
bun run eval:write-naturally:baseline
```

More cases are available in the [private eval repository](https://github.com/allagentsdev/agent-plugins-evals-private).

See [AGENTS.md](AGENTS.md) for contribution guidance.

## License

MIT; the original EntityProcess copyright notice is retained in [LICENSE](LICENSE). Financial-modeling source attribution is retained in the skill's [source notes](plugins/finance/skills/financial-modeling/references/sources.md). The example workbook is original and fictional; third-party example workbooks are linked rather than redistributed.
