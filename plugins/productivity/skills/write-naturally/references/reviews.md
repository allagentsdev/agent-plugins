# Reviews and technical discussion

Open with the conclusion. Name the contract boundary or risk. Use bullets only for genuinely parallel points. If asking a question, explain why the answer changes the implementation.

Make review status explicit and proportionate to the supplied evidence. A reproduced edge case establishes behavior; its impact and the applicable requirement determine whether it blocks approval. When an unresolved policy determines the recommendation, ask the policy question directly and explain how its answer changes the action. Preserve an agreed blocker or follow-up when rewriting, and keep approval language consistent with that status. Writing alone cannot settle a missing review decision.

For a technical concern, state plainly who or what is affected, the triggering input or condition, what the system actually does, and the consequence. Name what runs and where when that helps the recipient follow the behavior; do not leave these details compressed into labels they must decode. Group observations that share one cause and fix, including the same defect in multiple repositories, into one concern.

Close with the present constraint and the practical consequence: what can be done now, who must act, or which workaround remains.

Useful patterns:

- `Direction looks good. A few details still need to be covered:`
- `Thanks for catching the inconsistency. I think the right fix is X rather than Y.`
- `This deliberately keeps X because Y.`

## Direct but open questions

Structure follows the surface. Technical designs and architecture documents often need headings for navigation. Short review comments should skip headings when a few paragraphs stay clear; do not import an `Open question` or Red/Green template into a comment.

State the observed mismatch, ask the direct question, explain why the existing boundary may make the rule redundant, and leave room for a different intended meaning.

Example:

> `headers.caller` is optional in the Job Contract schema, but the Router design requires it to be `portal`. Do we need that stricter rule?
>
> The Router already knows the request came through the portal ingress and carries the parsed request as `PortalRequest`, so it can infer the caller without the Job Contract repeating it. Unless `headers.caller` represents a separate compatibility constraint, I think the Router should accept the contract without it.

Example of a final review comment, given a verified JSON Schema dialect mismatch and an agreed follow-up:

> We can make schema dialect handling consistent in a follow-up.
>
> An author uses `prefixItems` on the `items` array property to require its first entry to be an integer, but declares draft-07. A caller sends `{"items":["wrong type"]}` and validation accepts it because that dialect ignores `prefixItems`. The same data is rejected under 2020-12.
>
> We should support one dialect or validate each schema using its declared dialect.

Before returning a review comment, check that the recipient can understand the issue, example, agreed review status and next action without needing to unpack jargon or know the drafting conversation. One underlying issue should stay one concern, and the status should match the current decision.
