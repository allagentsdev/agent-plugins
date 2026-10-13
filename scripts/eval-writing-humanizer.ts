import { mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { humanizerSource } from '../evals/productivity/write-naturally/extensions/humanizer.mjs';

// Derive the comparison from the caller's suite, including private fixtures.
export async function runHumanizerComparison(suitePath: string, args: string[]) {
  const suiteRoot = resolve(suitePath);
  const config = Bun.YAML.parse(await Bun.file(resolve(suiteRoot, 'promptfooconfig.yaml')).text()) as any;
  const comparison = structuredClone(config);
  const runDir = resolve(suiteRoot, 'outputs', `humanizer-${randomUUID()}`);
  const workspace = resolve(runDir, 'workspace');
  const generatedConfig = resolve(runDir, 'config.json');
  const hookFile = resolve(runDir, 'extension.mjs');
  const promptFile = resolve(runDir, 'rewrite.md');
  const hookSource = pathToFileURL(resolve(import.meta.dir, '../evals/productivity/write-naturally/extensions/humanizer.mjs')).href;
  comparison.description = `${config.description} — Humanizer ${humanizerSource.revision}, SHA-256 ${humanizerSource.files['SKILL.md']}`;
  comparison.extensions = [`file://${hookFile}:workspaceHook`];
  comparison.prompts = [{ id: `file://${promptFile}`, label: `humanizer@${humanizerSource.revision}` }];
  const testPattern = config.tests.replace(/^file:\/\//, '');
  const testFiles = [...new Bun.Glob(testPattern).scanSync({ cwd: suiteRoot, absolute: true })].sort();
  if (!testFiles.length) throw new Error(`No cases matched ${testPattern}`);
  comparison.tests = (await Promise.all(testFiles.map(async filename =>
    Bun.YAML.parse(await Bun.file(filename).text()),
  ))).flat();
  for (const provider of comparison.providers) {
    provider.label = 'codex-humanizer';
    provider.config.working_dir = workspace;
  }
  for (const assertion of comparison.defaultTest.assert) {
    if (assertion.metric === 'repository-skill-used') {
      assertion.metric = 'humanizer-skill-used';
      assertion.value = 'humanizer';
    } else if (assertion.metric === 'repository-skill-path') {
      assertion.metric = 'humanizer-skill-path';
      assertion.value = `
        const expected = ${JSON.stringify(resolve(workspace, '.agents/skills/humanizer/SKILL.md'))};
        const calls = context.metadata?.skillCalls || [];
        const pass = calls.some(call => {
          const path = String(call.path || '').replace(/\\\\/g, '/');
          return path === '.agents/skills/humanizer/SKILL.md' || path === expected;
        });
        return { pass, score: pass ? 1 : 0, reason: pass ? 'Read the pinned Humanizer skill.' : 'Expected a skill read from the Humanizer comparison workspace.' };
      `;
    }
  }
  // Generated config lives under outputs; keep every judge in the original suite workspace.
  const rebaseJudge = (provider: any) => {
    if (provider?.config?.working_dir) {
      provider.config.working_dir = resolve(suiteRoot, provider.config.working_dir);
    }
  };
  for (const test of [comparison.defaultTest, ...comparison.tests]) {
    rebaseJudge(test.options?.provider);
    for (const assertion of test.assert || []) rebaseJudge(assertion.provider);
  }
  const originalPrompt = await Bun.file(resolve(suiteRoot, 'prompts/rewrite.md')).text();
  const separator = originalPrompt.indexOf('\n\n');
  if (separator < 0) throw new Error('Expected the suite prompt to begin with a skill-loading paragraph.');
  const prompt = 'First run `cat .agents/skills/humanizer/SKILL.md` and read its output. Then use $humanizer from that file to write the requested text. Use its embedded mode and return only the final rewritten text.\n\n' + originalPrompt.slice(separator + 2);
  await mkdir(workspace, { recursive: true });
  try {
    await Bun.write(hookFile, `import { createHumanizerHook } from ${JSON.stringify(hookSource)};\nexport const workspaceHook = createHumanizerHook(${JSON.stringify(workspace)});\n`);
    await Bun.write(promptFile, prompt);
    await Bun.write(generatedConfig, JSON.stringify(comparison, null, 2));
    const cliArgs = args.includes('--validate')
      ? ['validate', 'config', '-c', generatedConfig]
      : ['eval', '-c', generatedConfig, ...args, '--no-cache', '--no-share'];
    return await Bun.spawn([resolve('node_modules/.bin/promptfoo'), ...cliArgs], {
      stdout: 'inherit', stderr: 'inherit',
    }).exited;
  } finally {
    await rm(runDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const [suitePath, ...args] = process.argv.slice(2);
  if (!suitePath) throw new Error('Expected an eval suite directory.');
  process.exit(await runHumanizerComparison(suitePath, args));
}
