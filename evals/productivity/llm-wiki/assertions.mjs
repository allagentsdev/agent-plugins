export function checkDecisions(output, context) {
  const expected = context.vars.expected;
  if (!Array.isArray(expected) || expected.length === 0) {
    throw new Error('The case must declare its expected decisions.');
  }

  let decisions;
  try {
    const text = String(output).trim();
    const fenced = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
    decisions = JSON.parse(fenced ? fenced[1] : text);
  } catch {
    return { pass: false, score: 0, reason: 'Expected a JSON decision array.' };
  }
  if (!Array.isArray(decisions) || decisions.length !== expected.length) {
    return { pass: false, score: 0, reason: `Expected ${expected.length} concept decisions.` };
  }

  const remaining = [...decisions];
  for (const decision of expected) {
    const index = remaining.findIndex((actual) =>
      actual?.action === decision.action &&
      actual.page === decision.page &&
      Array.isArray(actual.evidence) &&
      new Set(actual.evidence).size === decision.evidence.length &&
      decision.evidence.every((id) => actual.evidence.includes(id)) &&
      typeof actual.reason === 'string' && actual.reason.trim(),
    );
    if (index === -1) {
      const page = decision.page ?? 'source only';
      return {
        pass: false,
        score: 0,
        reason: `Expected ${decision.action} for ${page} with evidence ${decision.evidence.join(', ')}.`,
      };
    }
    remaining.splice(index, 1);
  }
  return { pass: true, score: 1, reason: 'Page decisions and evidence match the case.' };
}
