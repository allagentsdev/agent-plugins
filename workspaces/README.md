# Workspace templates

These recipes compose plugins and original upstream skills into a project
workspace. Reusable plugins and workspace compositions live together in this
repository; the CLI and client adapters live in
[allagentsdev/allagents](https://github.com/allagentsdev/allagents).

| Workspace | Purpose |
| --- | --- |
| [Designer](designer) | Interfaces, film, editing, motion, audio review and marketing |
| [Engineering](engineering) | Portable engineering skills and Pi-native tools |
| [Finance](finance) | Financial modeling, budgets, forecasts and workpapers |

Use the template's README for prerequisites and account setup. For example:

```sh
allagents workspace init ./designer \
  --from allagentsdev/agent-plugins/workspaces/designer
```

Engineering and Finance were copied from the AllAgents
[engineering](https://github.com/allagentsdev/allagents/tree/782ffc9/examples/workspaces/engineering)
and [finance](https://github.com/allagentsdev/allagents/tree/782ffc9/examples/workspaces/finance)
examples. Their workspace declarations are unchanged; their documentation points
to the copies maintained here. The CLI repository's existing examples remain
available for users of those earlier URLs.

Templates describe dependencies; they do not grant credentials, provider access
or permission to spend money. Engineering includes Pi-native packages and
explicit setup commands: read its trust and installation instructions first.
