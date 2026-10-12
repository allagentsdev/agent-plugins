import { existsSync, realpathSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dir, '..');
const locations = ['.claude-plugin/marketplace.json', '.github/plugin/marketplace.json'];
const manifests = await Promise.all(locations.map((path) => Bun.file(resolve(root, path)).json()));
if (JSON.stringify(manifests[0]) !== JSON.stringify(manifests[1])) {
  throw new Error('Native marketplace catalogues differ');
}
const manifest = manifests[0];
if (manifest.name !== 'agent-plugins' || !Array.isArray(manifest.plugins)) {
  throw new Error('Invalid agent-plugins marketplace');
}
const declared = new Set<string>();
for (const entry of manifest.plugins) {
  if (typeof entry.name !== 'string' || !entry.name || declared.has(entry.name)) {
    throw new Error('Missing or duplicate plugin name');
  }
  declared.add(entry.name);
  if (entry.source !== `./plugins/${entry.name}` || !entry.description) {
    throw new Error(`Invalid catalogue entry: ${entry.name}`);
  }
  const directory = resolve(root, entry.source);
  const rel = relative(realpathSync(root), realpathSync(directory));
  if (isAbsolute(rel) || rel === '..' || rel.startsWith(`..${sep}`)) {
    throw new Error(`Plugin escapes catalogue: ${entry.name}`);
  }
  const metadata = await Bun.file(resolve(directory, '.claude-plugin/plugin.json')).json();
  if (metadata.name !== entry.name || !metadata.description || !metadata.version) {
    throw new Error(`Invalid plugin metadata: ${entry.name}`);
  }
  for (const markdown of new Bun.Glob('**/*.md').scanSync({ cwd: directory })) {
    const path = resolve(directory, markdown);
    const content = await Bun.file(path).text();
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1];
      if (!link || /^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith('#') || link.startsWith('/')) continue;
      const local = link.split('#')[0];
      if (local && !existsSync(resolve(dirname(path), local))) {
        throw new Error(`Missing local reference in ${entry.name}/${markdown}: ${link}`);
      }
    }
  }
}
const directories = readdirSync(resolve(root, 'plugins'), { withFileTypes: true }).filter((entry) => entry.isDirectory());
if (directories.length !== declared.size || directories.some((entry) => !declared.has(entry.name))) {
  throw new Error('Plugin directories and marketplace entries differ');
}
console.log(`Validated ${declared.size} plugins, both native catalogues and local Markdown references`);
