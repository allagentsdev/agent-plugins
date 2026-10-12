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
| [allagents](plugins/allagents) | Guidance for operating the AllAgents CLI |
| [deepwiki](plugins/deepwiki) | Public repository documentation tools and guidance |
| [engineering](plugins/engineering) | Interactive PR review skill |
| [finance](plugins/finance) | Financial modeling guidance and an original fictional XLSX example |
| [tradingview](plugins/tradingview) | TradingView market data MCP configuration |

Some plugins connect to external services; their availability and authentication are governed by those services. The catalogue contains reusable guidance and configurations, not personal credentials or records.

## Workspace templates

Workspace templates remain under [allagents/examples/workspaces](https://github.com/allagentsdev/allagents/tree/main/examples/workspaces). They compose plugins from this catalogue and other sources:

```yaml
plugins:
  - finance@allagentsdev/agent-plugins
  - engineering@allagentsdev/agent-plugins
```

The companion AllAgents migration preserves the old marketplace declarations, such as `finance@allagentsdev/allagents`, through external sources. Direct old directory URLs do not redirect: replace `allagentsdev/allagents/plugins/<name>` with `<name>@allagentsdev/agent-plugins`. Upgrade AllAgents before using the migrated forwarding marketplace. Pinned historical versions continue to use their original content.

## Development

Use Bun. The existing engineering plugin tests move with their implementation.

```sh
bun run validate
bun test
```

Changes are reviewed through pull requests. See [AGENTS.md](AGENTS.md) for contribution guidance.

## License

MIT; the original EntityProcess copyright notice is retained in [LICENSE](LICENSE). Financial-modeling source attribution is retained in the skill's [source notes](plugins/finance/skills/financial-modeling/references/sources.md). The example workbook is original and fictional; third-party example workbooks are linked rather than redistributed.
