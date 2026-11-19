# Rakazo checkout replay

This opt-in eval compares two Codex runs of the same historical bug, with and
without the scope guidance in [guided/AGENTS.md](guided/AGENTS.md). Each run
starts in a fresh oh-my-promptfoo workspace. The experiment records whether
Codex read the pinned Compound Engineering skill and whether the generated
change passes a Chromium check. It retains the resulting diff for human review.

The input comes from the public [Rakazo bug report](https://github.com/elie222/rakazo/issues/4728).
The replay pins the reported pre-fix commit and a Compound Engineering release.
The task gives the symptom and approval constraint. Keep the later PRs, fix
patches, PR comments, and grader files outside the candidate environment.

## Prepare and run

Use a dedicated Linux runner with Node 22.22 or later, Bun, Git, Python 3,
Bubblewrap with user namespaces, Codex, and access to the model service.
Use a clean runner account with only the source and tooling for the replay.
The launcher disables user Codex configuration. Codex's workspace sandbox
disables command networking and web search while the SDK can still reach its
model service. Shell tools can read files outside the workspace under Codex's
default filesystem policy, so keep answer material and unrelated checkouts off
that runner. The separate browser grader runs in a network namespace with
loopback and only the files it needs mounted.

Download the inputs ahead of time. The shallow fetches contain only the two
pinned commits. The runner can reuse these checkouts and oh-my-promptfoo's
source cache for subsequent trials.

```sh
bun install --frozen-lockfile
inputs=$(mktemp -d)
git init -q "$inputs/rakazo"
git -C "$inputs/rakazo" fetch --depth=1 https://github.com/elie222/rakazo.git 92eeb44a40f95caab81c8ae46bf2428a87a64ca5
git -C "$inputs/rakazo" checkout --detach FETCH_HEAD
git init -q "$inputs/compound-engineering"
git -C "$inputs/compound-engineering" fetch --depth=1 https://github.com/EveryInc/compound-engineering-plugin.git d8f8e03237bded06e77bcb3930b43ef841e7eeda
git -C "$inputs/compound-engineering" checkout --detach FETCH_HEAD
"$inputs/rakazo/infra/sandboxes/computer/install-agent-browser.sh" "$inputs/bin"

export REPLAY_RAKAZO_SOURCE="file://$inputs/rakazo"
export REPLAY_CE_SOURCE="file://$inputs/compound-engineering"
export REPLAY_AGENT_BROWSER="$inputs/bin/agent-browser"
export REPLAY_CHROMIUM=/absolute/path/to/chrome
suite=evals/engineering/rakazo-replay
export REPLAY_CODEX_LAUNCHER="$PWD/$suite/codex-replay.sh"
export ALLAGENTS_WORKSPACE_ROOT="$inputs/workspaces"
bun run promptfoo validate config -c "$suite/promptfooconfig.yaml"
bun run promptfoo eval -c "$suite/promptfooconfig.yaml" \
  --max-concurrency 1 --no-cache --no-share -o "$inputs/replay.json"
```

Use the same Chromium build across variants. The fixture was exercised with
Chrome for Testing 156.0.8078.4 and Rakazo's pinned agent-browser 0.41.0. The
Chromium directory must contain its runtime files. The run uses the Codex
binary from PATH and the Codex model connection configured for the SDK
(for example, an existing authenticated Codex session). Set `CODEX_MODEL` to
change the candidate model for both variants. oh-my-promptfoo manages the two
private writable checkouts and captures changes. Use an off-workspace location
for exported results.

## Compare the two runs

The Chromium assertion verifies the harmless note preflight, clicking a fresh
offscreen note, and refusal to click a real order button without approval.
The skill assertion records evidence that Codex read the skill. Inspect the
tool trace if the distinction between reading it and executing its workflow
matters to the comparison.

Review each captured diff against the original bug and approval constraint.
Record any extra runtime mechanisms, what requirement or evidence justifies
them, and what regression coverage would be lost by trimming the change.
Judge both diffs by the same criteria. Line count and similarity to the actual
merged patch are descriptive only. Separate environment errors from behavioral
failures. Compare wall time and available token usage alongside the browser
results and diff assessment. Treat one pair of runs as a pilot and repeat
the comparison before drawing conclusions about the guidance.
