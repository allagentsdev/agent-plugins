import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const humanizerSource = {
  repository: 'https://github.com/blader/humanizer',
  revision: '225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8',
  files: {
    'SKILL.md': '0612f1dfb1672b0ea9b97e139bf1f06cabe98d8b27424fe8ff01e1fb4cc99cad',
    LICENSE: '4ac4810254ab36d45419141aeb8e69bf50652cfafe5b2dab947d06d44e5cbf96',
  },
};

export function createHumanizerHook(workspace, fetchSource = fetch) {
  const agents = resolve(workspace, '.agents');
  const target = resolve(agents, 'skills/humanizer');
  return async function workspaceHook(hookName, context) {
    if (hookName === 'beforeAll') {
      await rm(agents, { recursive: true, force: true });
      try {
        const files = await Promise.all(Object.entries(humanizerSource.files).map(async ([name, hash]) => {
          const url = `https://raw.githubusercontent.com/blader/humanizer/${humanizerSource.revision}/${name}`;
          const response = await fetchSource(url, { signal: AbortSignal.timeout(30_000) });
          if (!response.ok) throw new Error(`Humanizer download failed (${response.status}): ${url}`);
          const bytes = Buffer.from(await response.arrayBuffer());
          if (createHash('sha256').update(bytes).digest('hex') !== hash) {
            throw new Error(`Humanizer checksum mismatch: ${name}`);
          }
          return { name, bytes };
        }));
        await mkdir(target, { recursive: true });
        await Promise.all(files.map(({ name, bytes }) => writeFile(resolve(target, name), bytes)));
        await writeFile(resolve(target, 'source.json'), JSON.stringify(humanizerSource, null, 2));
      } catch (error) {
        await rm(agents, { recursive: true, force: true });
        throw error;
      }
    }
    if (hookName === 'afterAll') await rm(agents, { recursive: true, force: true });
    return context;
  };
}
