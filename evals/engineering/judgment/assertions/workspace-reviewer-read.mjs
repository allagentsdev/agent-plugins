import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const workspace = new URL('../workspace/', import.meta.url);

export default function workspaceReviewerRead(_output, context) {
  let items;
  try {
    items = JSON.parse(context.providerResponse.raw).items;
  } catch {
    return { pass: false, score: 0, reason: 'Missing Codex turn trace.' };
  }

  const { skill, persona } = context.vars;
  const paths = [
    `.agents/skills/${skill}/SKILL.md`,
    `.agents/skills/${skill}/references/personas/${persona}.md`,
  ];
  const commands = (Array.isArray(items) ? items : []).filter((item) =>
    item.type === 'command_execution' && item.exit_code === 0);

  const missing = paths.filter((relativePath) => {
    const file = new URL(relativePath, workspace);
    const contents = readFileSync(file, 'utf8');
    const spellings = [relativePath, `./${relativePath}`, fileURLToPath(file)];
    return !commands.some(({ command, aggregated_output }) => {
      const tokens = (command || '').split(/[\s'"&|;]+/);
      return spellings.some((path) => tokens.includes(path)) && aggregated_output?.includes(contents);
    });
  });

  return {
    pass: missing.length === 0,
    score: missing.length ? 0 : 1,
    reason: missing.length ? `Missing staged file contents in Codex read trace: ${missing.join(', ')}`
      : 'Codex read the staged skill and reviewer instructions.',
  };
}
