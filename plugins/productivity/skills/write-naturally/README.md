# Write naturally

## Writing and review

Use the same skill to write, rewrite or review prose. A review checks the supplied text against the shared guidance, whether or not its author used the skill. It returns evidence-backed findings and suggested corrections; it does not replace the document unless you ask for a rewrite.

- “Use write-naturally to review this plan for its intended audience. Include the surrounding sections in your review.”
- “Rewrite this document, then have an independent agent review it before returning the final text.”

For substantial documents intended for publication, the skill requests a separate reviewer when the host supports one. The reviewer loads the same skill and [prose-review procedure](references/prose-review.md), rather than a second set of writing rules. Without agent support, review runs in the current context and must not be described as independent. Short messages do not require an agent.

This does not enforce invocation: a publishing workflow can require this skill's review operation even when its writing operation was skipped.

## Practical gotchas

- **Long conversations:** an agent can read the skill early and later drift from it. Before the final version, check which guidance it is applying. If the answer is vague or the prose has drifted, ask it to reread the skill and the relevant reference. A claim that it remembers the skill is weaker evidence than a fresh read.
- **Use your paraphrase:** if you need to ask “so you mean …?”, give the agent your plain-language interpretation, confirm the meaning, then ask it to put that explanation into the text. The next reader should understand it without repeating your clarification.
- **Separate wording from judgment:** clearer prose cannot establish whether a concern is a blocker. Settle the evidence and intended action, then ask for a final version that carries that decision and only the context its recipient needs.

For example: “So you mean a caller can send text where an integer is required, and validation accepts it?” Once confirmed: “Put that caller example directly in the comment, with what happens and the proposed follow-up.”

The [core skill](SKILL.md) applies to general prose. Its [prose-review reference](references/prose-review.md) defines how to assess writing; [reviews](references/reviews.md) covers expressing code-review findings, and [technical designs](references/technical-designs.md) covers design documents. The [public eval suite](../../../../evals/productivity/write-naturally/promptfooconfig.yaml) uses fictional examples, including nontechnical writing. Additional coverage lives in the [private eval repository](https://github.com/allagentsdev/agent-plugins-evals-private).
