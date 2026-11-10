# Engineering

Reusable skills for interactive diagrams, pull request review, and repository maintenance.

## Installation

Choose the scope and target clients explicitly. Before installing, inspect each selected client's skill directory for unmanaged copies of `archify`, `github-attention`, or `pr-interactive-review`. Stop on a conflict and preserve those copies outside the installation destination: AllAgents file synchronization can replace existing skill contents and remove extra files. This check also applies when selecting only Archify with `--skill`, because the installer can synchronize other included skills before applying that selection.

```sh
npx allagents plugin install engineering@allagentsdev/agent-plugins --scope project --client codex --yes
```

Claude Code and Copilot CLI can also install the engineering plugin through this repository's native marketplaces. Installing the plugin copies its skills and supporting resources; install runtime software separately.

## Archify

[Archify](skills/archify/SKILL.md) turns requirements, Mermaid, or repository evidence into standalone interactive HTML diagrams and one-page explainers. It supports architecture, workflow, sequence, data-flow, lifecycle/state, ERD, class, tree, timeline, and waterfall diagrams.

After installing, ask your agent:

```text
Use Archify to diagram a web request: Browser calls the API,
the API checks Redis, and a cache miss queries PostgreSQL and fills the cache.
```

### Runtime prerequisites

- Node.js 18 or newer. No dependency installation is required inside the skill package.
- Chrome, Chromium, or Microsoft Edge for the automated browser checks used by `finalize`. Set `ARCHIFY_CHROME` to the browser executable if it is not detected automatically.
- A browser to view the delivered HTML. Viewers need no Archify installation. No Archify account is required for local generation.

The upstream skill's commands use `node bin/archify.mjs` as a placeholder. Replace `bin/archify.mjs` with the installed skill's absolute path and run from the project working directory. For example, from this repository checkout:

```sh
node plugins/engineering/skills/archify/bin/archify.mjs doctor
```

`finalize` and `deliver` may check the fixed upstream stable-release manifest for an optional update reminder. They do not install updates or send diagram or project contents. Set `ARCHIFY_UPDATE_CHECK_DISABLED=1` to disable that request and reminder-state writes. Update this bundled copy through the engineering plugin to retain its packaging and provenance.

### Source and licensing

Copied from [`tt-a1i/archify/archify`](https://github.com/tt-a1i/archify/tree/11b0d6031853bdae89eed57e7979aabbf0034097/archify) at commit `11b0d6031853bdae89eed57e7979aabbf0034097` (package version `3.2.0`). The skill instructions, runtime, schemas, references, JSON examples, locales, and required template and vendor assets retain their upstream contents and executable modes.

Following upstream's clean-package rules, repository-only dependency lockfiles and generator scripts are omitted, and `scripts` and `devDependencies` are removed from the skill's `package.json`. Pre-rendered example HTML is also omitted; generate artifacts into a separate working directory. Required checked-in runtime assets, including the viewer template and generated validators, remain bundled.

Archify is Apache-2.0 with historical MIT notices. Preserve its [LICENSE](skills/archify/LICENSE), [LICENSE-MIT](skills/archify/LICENSE-MIT), [NOTICE](skills/archify/NOTICE), [third-party notices](skills/archify/THIRD_PARTY_NOTICES.md), and component license files when redistributing it. Font and brand-mark terms remain those recorded upstream.

## Other skills

- [github-attention](skills/github-attention/SKILL.md): read-only checks of explicitly selected GitHub repositories, using Bun and an authenticated `gh` CLI.
- [pr-interactive-review](skills/pr-interactive-review/SKILL.md): a local interactive site for structured PR review findings.
