# Engineering judgment evals

Can a reviewer explain which mechanisms earn their place in a fix? The six cases pair
a narrow checkout scrolling bug with counterexamples where latency, transaction safety,
or real browser behavior requires additional work. The suite also tests whether reviewers
can decline speculative feedback and accept a sufficient fix without inventing findings.

| Case | What the review needs to decide |
| --- | --- |
| Checkout plan | Bound the geometry wait locally, preserve approval and fallback, and focus browser proof |
| Checkout feedback | Decline unsupported additions and investigate stable offscreen samples without claiming a reproduction |
| Invoice preview deadline | Meet the measured caller deadline and return partial results |
| Payout replay | Keep provider deduplication and challenge an unrelated retry abstraction |
| Editor focus | Keep the browser regression that observes actual focus and persistence |
| CSV download | Accept byte-level API proof and preserve the format contract |

## Run

Install dependencies with `bun install --frozen-lockfile` and configure an authenticated
Codex connection, as for the public writing evals. Set `CE_PLUGIN_ROOT` to the root
of a Compound Engineering v3.38.1 installation, or to a checkout of the upstream
[release commit](https://github.com/EveryInc/compound-engineering-plugin/tree/d8f8e03237bded06e77bcb3930b43ef841e7eeda).
The root must contain `skills/`. The suite checks the four upstream files against that
revision before staging them. Set `CODEX_MODEL` and `CODEX_JUDGE_MODEL` to override the
configured reviewer and judge models.

Run from the repository root:

```sh
suite=evals/engineering/judgment
bun run --bun promptfoo validate config -c "$suite/promptfooconfig.yaml"
mkdir -p "$suite/outputs"
bun run --bun promptfoo eval -c "$suite/promptfooconfig.yaml" \
  --filter-metadata baseline=representative --max-concurrency 1 --no-cache --no-share \
  -o "$suite/outputs/representative.json"
```

The filter selects the checkout feedback and invoice deadline cases. Remove it to
run all six. Use one process per checkout, since each run stages files in the same
`workspace/`. Keep result JSON and traces in the ignored `outputs/` directory and
out of public reports.

## What runs

The target is a bounded reviewer pass using the upstream `ce-code-review`
maintainability persona or the `ce-doc-review` scope guardian persona. Codex reads
the corresponding `SKILL.md` and persona from the staged workspace and reviews a
self-contained evidence packet. Promptfoo checks those reads in the Codex turn trace
and grades the decision with case-specific criteria. The parent orchestration,
reviewer dispatch, a live repository diff, and live browser execution are outside
this harness. A passing score measures the reviewer's judgment on the supplied
evidence, including the limits of that evidence.

The first two cases are original summaries derived from Rakazo's public
[report and Chromium reproduction](https://github.com/elie222/rakazo/issues/4728),
[earlier PR #4738 at its final head](https://github.com/elie222/rakazo/commit/a6aec3c670931e38b345a0f1cf58121bfda536f5),
and [replacement PR #5036 at its reviewed revision](https://github.com/elie222/rakazo/commit/f3648704e8f7d1d625dc85e373361b29ac479f08).
The replacement had scripted unit results and its author reported no live Chromium
check. The [maintainer's rationale](https://github.com/elie222/rakazo/pull/5036#issuecomment-6931543267)
informed the feedback case. The rubric evaluates the evidence and allows equivalent
mechanisms, including a batch limit where a contract or measurement justifies one.
The remaining four cases are original synthetic fixtures.
