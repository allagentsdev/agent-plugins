import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

// Build the baseline from the live suite so both conditions use the same graders.
const [suitePath, ...args] = process.argv.slice(2);
if (!suitePath) throw new Error('Expected an eval suite directory.');
const suiteRoot = resolve(suitePath);
const config = Bun.YAML.parse(await Bun.file(resolve(suiteRoot, 'promptfooconfig.yaml')).text()) as any;
const baseline = structuredClone(config);
delete baseline.extensions;
baseline.description = 'Humanizer patterns without write-naturally';
baseline.prompts = [{ id: `file://${resolve(suiteRoot, 'prompts/baseline.md')}`, label: 'without-write-naturally' }];
baseline.tests = `file://${resolve(suiteRoot, 'tests/humanizer.yaml')}`;
for (const provider of baseline.providers) {
  provider.label = 'codex-without-write-naturally';
  provider.config.working_dir = resolve(suiteRoot, 'baseline-workspace');
}
baseline.defaultTest.assert = baseline.defaultTest.assert.filter(
  (assertion: any) => !['repository-skill-used', 'repository-skill-path'].includes(assertion.metric),
);
for (const assertion of baseline.defaultTest.assert) {
  if (assertion.provider?.config?.working_dir) {
    assertion.provider.config.working_dir = resolve(suiteRoot, assertion.provider.config.working_dir);
  }
}
baseline.defaultTest.assert.push({
  type: 'javascript',
  metric: 'baseline-no-tools',
  value: `file://${resolve(suiteRoot, 'assertions/baseline-no-tools.mjs')}`,
});
const outputDir = resolve(suiteRoot, 'outputs');
await mkdir(outputDir, { recursive: true });
const generatedConfig = resolve(outputDir, `baseline-${randomUUID()}.json`);
await Bun.write(generatedConfig, JSON.stringify(baseline, null, 2));
const validateOnly = args.includes('--validate');
const cliArgs = validateOnly
  ? ['validate', 'config', '-c', generatedConfig]
  : ['eval', '-c', generatedConfig, ...args, '--no-cache', '--no-share'];
let status = 1;
try {
  status = await Bun.spawn([resolve('node_modules/.bin/promptfoo'), ...cliArgs], {
    stdout: 'inherit', stderr: 'inherit',
  }).exited;
} finally {
  await rm(generatedConfig, { force: true });
}
process.exit(status);
