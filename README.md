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
| [engineering](plugins/engineering) | Interactive PR review skill |
| [productivity](plugins/productivity) | Direct technical writing and behavioral evals |
| [finance](plugins/finance) | Financial modeling guidance and an original fictional XLSX example |
| [tradingview](plugins/tradingview) | TradingView market data MCP configuration |

The CLI-specific guidance plugin remains in [allagents/plugins/allagents](https://github.com/allagentsdev/allagents/tree/main/plugins/allagents), installed as `allagents@allagentsdev/allagents`.

Some plugins connect to external services; their availability and authentication are governed by those services. The catalogue contains reusable guidance and configurations, not personal credentials or records.

## Workspace templates

Workspace templates remain under [allagents/examples/workspaces](https://github.com/allagentsdev/allagents/tree/main/examples/workspaces). They compose plugins from this catalogue and other sources:

```yaml
plugins:
  - finance@allagentsdev/agent-plugins
  - engineering@allagentsdev/agent-plugins
```

The companion AllAgents migration preserves the old marketplace declarations, such as `finance@allagentsdev/allagents`, through external sources. Direct old directory URLs for the moved plugins do not redirect: replace `allagentsdev/allagents/plugins/<name>` with `<name>@allagentsdev/agent-plugins`. Upgrade AllAgents before using the migrated forwarding marketplace. Pinned historical versions continue to use their original content.

## Development

Use Bun. The existing engineering plugin tests move with their implementation.

```sh
bun run validate
bun test
```

The productivity plugin's writing evals live in [evals/productivity/write-naturally](evals/productivity/write-naturally/promptfooconfig.yaml). Install development dependencies with `bun install`, then use `bun run eval:validate` or `bun run eval:write-naturally`. Its 28 fixtures are fictional and cover team messages, customer updates, planning notes, reviews and technical designs. The writer and judge run in a read-only workspace with network access disabled inside the model workspace; model-service requests still use the configured Codex provider. The suite never posts reviews. The writer defaults to `gpt-6.1-sol`; the grader defaults to `gpt-5.6-luna`. Use `CODEX_MODEL` and `CODEX_JUDGE_MODEL` to override them separately. Focus on review comments with `bun run eval:write-naturally --filter-metadata group=review-regression --max-concurrency 2`.

Additional coverage lives in the [private eval repository](https://github.com/allagentsdev/agent-plugins-evals-private).

### Humanizer comparison

Eight fictional cases inspired by [Humanizer](https://github.com/blader/humanizer/blob/225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8/SKILL.md) cover rhetorical framing, inflated claims, formatting, voice and replies to readers who already know the context. Controls keep useful checklists and plain technical wording. Run the same cases with the skill using `bun run eval:write-naturally --filter-metadata group=humanizer`, then without it using `bun run eval:write-naturally:baseline`. Both conditions use the same writer model, reasoning setting and graders. The baseline rejects recorded tool calls, including file reads, and missing traces. This checks the model turn; it cannot rule out instructions supplied by the surrounding Codex configuration.

Readability has separate style criteria for these cases; fact preservation is graded independently. Calibration answers stay in metadata and are never supplied to the writer. Compare individual outputs and repeat runs before attributing a gain to the skill.

Changes are reviewed through pull requests. See [AGENTS.md](AGENTS.md) for contribution guidance.

## License

MIT; the original EntityProcess copyright notice is retained in [LICENSE](LICENSE). Financial-modeling source attribution is retained in the skill's [source notes](plugins/finance/skills/financial-modeling/references/sources.md). The example workbook is original and fictional; third-party example workbooks are linked rather than redistributed.
