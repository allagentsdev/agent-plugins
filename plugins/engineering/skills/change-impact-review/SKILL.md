---
name: change-impact-review
description: Supplement a completed primary code review by tracing changed behavior through unchanged code and later effects. Use for an additional impact review after CE or another primary review.
---

# Change Impact Review

Report consequential defects the primary review missed. Prefer a fresh context when the host supports it; use the existing primary receipt rather than starting another primary review pipeline.

## Establish the scope

Read the primary review receipt and its findings. Verify that it completed and that its repository, exact fixed base/head revisions, and any recorded worktree changes match the source being inspected. Keep that scope fixed. If the receipt is missing, failed, stale, or cannot establish the match, return `blocked` with the concrete missing precondition. Claim CE completion only when its receipt supports it.

Inspect source read-only. Use existing authorized evidence; running code or tests, or changing source, Git, or GitHub requires separate caller authority. Save reports only to the caller's supplied writable artifact location, or return them inline when no location was supplied. Keep the primary receipt immutable.

## Follow the behavior

Trace each changed behavior through its reachable callers, unchanged helpers, shared state, and deferred work until its relevant effects are accounted for or an evidence gap is identified. Use symbol/reference tools or bounded text searches to inspect the execution path and cited code at the reviewed revision.

Consider success, failure, and repeated calls; cache identity and invalidation; trust boundaries; and interactive or control state where the change makes them relevant. These are reasoning prompts, not finding quotas.

For each suspected defect:

- Establish how the change introduces or newly exposes it, the concrete trigger and reachable path, and the supported consequence. Check suspected missing guards or fields against declarations and callers.
- Inspect whether relevant regression fixtures actually reach the behavior. Distinguish code-derived evidence from observed execution; preserve missing evidence and claim test runs or red/green results only when recorded.
- Compare the causal defect with the primary findings. Suppress duplicates even when wording, affected lines, or downstream symptoms differ.

Retain only additional consequential defects supported by that evidence. Keep unsupported concerns as explicitly separate questions or coverage gaps. Zero additional findings is valid.

## Return the supplemental report

Prefer the caller's structured format and existing finding schema. Otherwise return a concise, self-contained report with:

- `complete` or `blocked`, exact reviewed scope, and primary receipt reference.
- Additional findings, each with file/line, trigger and path evidence, cause tied to the change, and observed or supported consequence.
- Paths covered by this pass, unresolved paths/questions, and actual checks or execution limits.

Mark complete when the relevant effects have been traced or explicitly recorded as unresolved and every retained finding meets the evidence and deduplication criteria. State only this pass's coverage. Completion leaves the primary verdict unchanged and grants no authority to ship or apply fixes.
