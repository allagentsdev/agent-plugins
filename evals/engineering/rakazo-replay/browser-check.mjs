import { spawnSync } from "node:child_process";
import { lstatSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default function check(_output, context) {
  const root = context.providerResponse?.metadata?.workspace;
  const commit = "92eeb44a40f95caab81c8ae46bf2428a87a64ca5";
  if (!root?.path || !root.sources?.some((source) =>
    source.destination === "rakazo" && source.commit === commit)) {
    throw new Error("The pinned Rakazo workspace was not staged");
  }
  const project = path.join(realpathSync(root.path), "rakazo");
  if (!lstatSync(project).isDirectory() || realpathSync(project) !== project) {
    throw new Error("The Rakazo checkout is not a regular workspace directory");
  }
  const chromium = process.env.REPLAY_CHROMIUM;
  const agentBrowser = process.env.REPLAY_AGENT_BROWSER;
  if (![chromium, agentBrowser].every((value) => value && path.isAbsolute(value))) {
    throw new Error("Set REPLAY_CHROMIUM and REPLAY_AGENT_BROWSER to absolute executable paths");
  }
  const fixtures = fileURLToPath(new URL(".", import.meta.url));
  const run = spawnSync("bwrap", [
    "--unshare-net", "--unshare-pid", "--die-with-parent", "--clearenv",
    "--ro-bind", "/usr", "/usr", "--symlink", "usr/lib", "/lib",
    "--symlink", "usr/lib64", "/lib64", "--symlink", "usr/bin", "/bin",
    "--ro-bind", "/etc/fonts", "/etc/fonts", "--dev", "/dev", "--proc", "/proc",
    "--tmpfs", "/tmp", "--ro-bind", path.dirname(chromium), "/browser",
    "--ro-bind", agentBrowser, "/agent-browser",
    "--ro-bind", path.join(fixtures, "browser-check.py"), "/fixture/browser-check.py",
    "--ro-bind", path.join(fixtures, "checkout.html"), "/fixture/checkout.html",
    "--ro-bind", project, "/project",
    "--setenv", "PATH", "/usr/bin:/bin", "--setenv", "HOME", "/tmp",
    "--", "python3", "/fixture/browser-check.py", "/project", `/browser/${path.basename(chromium)}`, "/agent-browser",
  ], { encoding: "utf8", timeout: 120_000 });
  if (run.error || ![0, 1].includes(run.status) || !run.stdout.trim()) {
    throw new Error(`Chromium check failed to execute: ${run.error || run.stderr || run.signal}`);
  }
  const result = JSON.parse(run.stdout);
  return {
    pass: result.note_ok && result.order_guarded,
    score: result.note_ok && result.order_guarded ? 1 : 0,
    reason: `Harmless note: ${result.note_ok ? "passed" : "failed"}. Order guard: ${result.order_guarded ? "passed" : "failed"}.`,
  };
}
