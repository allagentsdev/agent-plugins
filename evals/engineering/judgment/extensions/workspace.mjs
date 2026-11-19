import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Compound Engineering v3.38.1 at d8f8e03237bded06e77bcb3930b43ef841e7eeda.
const revision = {
  'ce-code-review/SKILL.md': '210fe6141d256c0e3f9fca59a6b2702739329d8129e57204860815c80d4f6bad',
  'ce-code-review/references/personas/maintainability-reviewer.md': '7fe256bf4f590b21f0f7bb7d87103960f5bc2c0bfa3710e75da662050c1bc386',
  'ce-doc-review/SKILL.md': 'b8a116f81de348c112fd5be198409f8c4baafd46f779a8b3d6e12a6904c6a6a9',
  'ce-doc-review/references/personas/scope-guardian-reviewer.md': '52472d2d38c402e219891ca041f9fd29b16db6b5be87b5d48d5dcd6f3c644692',
};
const target = fileURLToPath(new URL('../workspace/.agents', import.meta.url));

export function workspaceHook(hookName, context) {
  if (hookName === 'afterAll') rmSync(target, { recursive: true, force: true });
  if (hookName !== 'beforeAll') return context;

  rmSync(target, { recursive: true, force: true });
  const root = process.env.CE_PLUGIN_ROOT;
  if (!root) throw new Error('Set CE_PLUGIN_ROOT to the Compound Engineering v3.38.1 plugin directory.');

  const files = Object.entries(revision).map(([relativePath, expectedHash]) => {
    const source = resolve(root, 'skills', relativePath);
    const bytes = readFileSync(source);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== expectedHash) throw new Error(`Unexpected Compound Engineering revision at ${source}; expected v3.38.1.`);
    return { path: resolve(target, 'skills', relativePath), bytes };
  });

  for (const { path, bytes } of files) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, bytes);
  }
  return context;
}
