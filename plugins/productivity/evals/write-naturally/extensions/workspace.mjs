import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const suiteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = resolve(suiteRoot, '../..');
const workspace = resolve(suiteRoot, 'workspace');
const workspaceAgents = resolve(workspace, '.agents');
const skillSource = resolve(pluginRoot, 'skills/write-naturally');
const skillTarget = resolve(workspaceAgents, 'skills/write-naturally');

export function workspaceHook(hookName, context) {
  if (hookName === 'beforeAll') {
    rmSync(workspaceAgents, { recursive: true, force: true });
    mkdirSync(dirname(skillTarget), { recursive: true });
    cpSync(skillSource, skillTarget, { recursive: true });
  }

  if (hookName === 'afterAll') {
    rmSync(workspaceAgents, { recursive: true, force: true });
  }

  return context;
}
