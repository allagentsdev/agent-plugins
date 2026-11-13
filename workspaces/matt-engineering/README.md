# Matt Engineering

Matt Pocock's engineering workflows, installed from the original
[mattpocock/skills](https://github.com/mattpocock/skills) source into
`.agents/skills/` through AllAgents' `universal` client.

The recipe includes the four skills named in
[Machina's post](https://x.com/EXM7777/status/2120856056977113363):
`grill-me`, `to-spec`, `to-tickets`, and `implement`. It also includes every
Matt skill selected in the [Engineering workspace](../engineering)
and the helpers these workflows invoke:

| Skills | Purpose |
| --- | --- |
| `grill-me`, `grilling`, `grill-with-docs` | Explore requirements and decisions, with optional domain documentation |
| `to-spec`, `to-tickets` | Turn the conversation into a spec and implementation tickets |
| `implement`, `tdd`, `code-review` | Implement, test, and review the work |
| `wayfinder`, `research`, `prototype` | Resolve larger planning decisions through research and prototypes |
| `improve-codebase-architecture`, `codebase-design`, `domain-modeling` | Improve module design and record domain language and decisions |
| `setup-matt-pocock-skills` | Configure the project's issue tracker and domain documentation |

The explicit skill selection follows upstream's default branch and includes
supporting resources. New unrelated upstream skills are not enabled automatically.

## Prerequisites

- AllAgents, Git, and network access for installation.
- An assistant that discovers `.agents/skills/`, supports invoking skills, and
  can delegate to subagents for the workflows that use them.
- Your project's normal build, typecheck, and test tools.
- For GitHub or GitLab issue tracking, the corresponding authenticated `gh` or
  `glab` CLI and repository access. Local Markdown tracking is also supported.

Model access and hosting are separate from skill installation. Choose and
authenticate models in your assistant. To follow the post's optional Cloudflare
hosting and database setup, install and authenticate
[Wrangler](https://developers.cloudflare.com/workers/wrangler/) separately.
This recipe does not configure models, accounts, hosting, or databases.

## Create a workspace

```sh
allagents workspace init ./matt-engineering-demo \
  --from allagentsdev/agent-plugins/workspaces/matt-engineering
```

From a local repository checkout, replace `--from` with the absolute path to
`workspaces/matt-engineering`.

Open the new project in your assistant and run `/setup-matt-pocock-skills` once
to configure its issue tracker and domain documentation. Use your assistant's
equivalent skill invocation syntax if it does not use slash commands. Then follow
the post's sequence:

```text
/grill-me
/to-spec
/to-tickets
/implement
```

The upstream workflows retain their own questions and approval steps for specs
and tickets. Keep credentials and personal service configuration outside this
shared template.

## Update

```sh
allagents plugin update --scope project
```

This fetches the latest upstream revision while preserving the recipe's explicit
skill selection.
