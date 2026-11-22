# LLM Wiki bulk-ingestion evals

The two Promptfoo prompts use the same synthetic cases and model. The baseline passes the vendored Hermes v2.1.0 skill verbatim. The candidate adds one instruction to its bulk-ingest section at eval time.

Run from the repository root after `bun install`.

```sh
bunx --no-install promptfoo validate config -c evals/productivity/llm-wiki/promptfooconfig.yaml
bunx --no-install promptfoo eval -c evals/productivity/llm-wiki/promptfooconfig.yaml --no-cache --no-share --repeat 3
```

The assertion checks the page decisions and cited excerpt IDs. These cases cover editorial judgment over a supplied snapshot. They do not exercise tool selection, source discovery, or wiki file writes. Compare both prompts on the same cases and model, and check individual failures before claiming an improvement.
