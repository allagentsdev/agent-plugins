#!/bin/sh
# Put the selected instructions at the root of the fresh SDK workspace.
set -eu
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
fi
exec codex --ignore-user-config "$@"
