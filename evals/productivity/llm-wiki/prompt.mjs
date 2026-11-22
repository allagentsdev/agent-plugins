import { readFileSync } from 'node:fs';

const upstream = readFileSync(
  new URL('../../../plugins/productivity/skills/llm-wiki/SKILL.md', import.meta.url),
  'utf8',
);
const instruction = readFileSync(new URL('./concept-gap.md', import.meta.url), 'utf8');
const insertionPoint = '4. Create/update pages in one pass';
if (!upstream.includes(insertionPoint)) {
  throw new Error('The vendored bulk-ingest section changed. Review the candidate insertion.');
}
const candidate = upstream.replace(insertionPoint, `${instruction}\n${insertionPoint}`);

function plan(skill, scenario) {
  return `Apply the following skill to a fictional bulk ingestion. The relevant
wiki schema, existing pages and source excerpts are all supplied. Plan the
concept-level wiki edits from this batch.

<skill>
${skill}
</skill>

<scenario>
${scenario}
</scenario>

Return a JSON array of decisions. For each decision, give:
- "action": "new-page", "extend-page", or "source-note". Use "source-note" when
  the material belongs with the captured source and needs no maintained page edit.
- "page": the new or existing concept slug, or null for "source-note". Use
  lowercase kebab-case.
- "evidence": source excerpt IDs supporting the decision.
- "reason": a sentence explaining the decision.

Report only concept decisions and omit index, log, and ordinary raw-file edits.`;
}

export function baseline({ vars }) {
  return plan(upstream, vars.scenario);
}

export function conceptGap({ vars }) {
  return plan(candidate, vars.scenario);
}
