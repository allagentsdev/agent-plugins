#!/bin/sh
# Put the selected instructions at the root of the fresh SDK workspace.
set -eu
codex_bin=${REPLAY_CODEX_BIN:?Set REPLAY_CODEX_BIN to a compatible Codex executable}
if [ "${1:-}" = exec ]; then
  workspace=
  previous=
  for argument do
    if [ "$previous" = --cd ]; then
      workspace=$argument
      break
    fi
    previous=$argument
  done
  test -n "$workspace"
  test -d "$workspace/rakazo/.git"
  test -f "$workspace/task/AGENTS.md"
  test ! -e "$workspace/AGENTS.md"
  cp "$workspace/task/AGENTS.md" "$workspace/AGENTS.md"
  mkdir -p "$workspace/.agents/skills"
  cp -R "$workspace/compound-engineering/skills/ce-work" "$workspace/.agents/skills/"
  mkdir "$workspace/tmp"
  export TMPDIR="$workspace/tmp"
  shift
  exec "$codex_bin" exec --ignore-user-config "$@"
fi
exec "$codex_bin" "$@"
