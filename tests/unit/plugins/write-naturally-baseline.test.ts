import { describe, expect, test } from 'bun:test';
import baselineNoTools from '../../../evals/productivity/write-naturally/assertions/baseline-no-tools.mjs';

const context = (items: unknown[]) => ({ providerResponse: { raw: JSON.stringify({ items }) } });
const response = { type: 'agent_message', text: 'Rewritten text.' };

describe('write-naturally baseline trace', () => {
  test('accepts a response with optional reasoning and no tools', () => {
    expect(baselineNoTools('', context([response])).pass).toBe(true);
    expect(baselineNoTools('', context([{ type: 'reasoning' }, response])).pass).toBe(true);
  });
  test('rejects command reads regardless of relative skill path', () => {
    for (const path of ['../workspace/.agents/skills/write-naturally/SKILL.md', '../../../skills/write-naturally/SKILL.md']) {
      expect(baselineNoTools('', context([{ type: 'command_execution', command: `cat ${path}` }, response])).pass).toBe(false);
    }
  });
  test('rejects other tools and unknown future item types', () => {
    for (const type of ['mcp_tool_call', 'web_search', 'file_change', 'unknown_tool']) {
      expect(baselineNoTools('', context([{ type }, response])).pass).toBe(false);
    }
  });
  test('rejects missing, malformed and incomplete traces', () => {
    for (const raw of [undefined, '{', '{}', '{"items":[]}', '{"items":[null]}']) {
      expect(baselineNoTools('', { providerResponse: { raw } }).pass).toBe(false);
    }
  });
  test('rejects a separately recorded skill read', () => {
    expect(baselineNoTools('', { ...context([response]), metadata: { skillCalls: [{ name: 'write-naturally' }] } }).pass).toBe(false);
  });
});
