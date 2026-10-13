// Audit the full Codex turn, rather than Promptfoo's path-based skill heuristic.
export default function baselineNoTools(_output, context) {
  const fail = (reason) => ({ pass: false, score: 0, reason });
  if ((context.metadata?.skillCalls || []).length) return fail('Baseline recorded a skill read.');
  let turn;
  try {
    turn = JSON.parse(context.providerResponse?.raw);
  } catch {
    return fail('Baseline has no parseable Codex turn trace.');
  }
  if (!Array.isArray(turn?.items) || !turn.items.some((item) => item?.type === 'agent_message')) {
    return fail('Baseline trace has no recorded agent response.');
  }
  const tools = turn.items.filter((item) => !['agent_message', 'reasoning'].includes(item?.type));
  if (tools.length) return fail(`Baseline recorded tool items: ${tools.map((item) => item?.type || 'unknown').join(', ')}.`);
  return { pass: true, score: 1, reason: 'Baseline trace records a response and no tool calls.' };
}
