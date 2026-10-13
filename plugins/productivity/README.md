# Productivity

## Write naturally: practical gotchas

- **Long conversations:** an agent can read the skill early and later drift from it. Before the final version, check which guidance it is applying. If the answer is vague or the prose has drifted, ask it to reread the skill and the relevant reference. A claim that it remembers the skill is weaker evidence than a fresh read.
- **Use your paraphrase:** if you need to ask “so you mean …?”, give the agent your plain-language interpretation, confirm the meaning, then ask it to put that explanation into the text. The next reader should understand it without repeating your clarification.
- **Separate wording from judgment:** clearer prose cannot establish whether a concern is a blocker. Settle the evidence and intended action, then ask for a final version that carries that decision and only the context its recipient needs.

For example: “So you mean a caller can send text where an integer is required, and validation accepts it?” Once confirmed: “Put that caller example directly in the comment, with what happens and the proposed follow-up.”

The [core skill](skills/write-naturally/SKILL.md) applies to general prose. It loads additional guidance for [reviews](skills/write-naturally/references/reviews.md) or [technical designs](skills/write-naturally/references/technical-designs.md) when needed. The [public eval suite](evals/write-naturally/promptfooconfig.yaml) uses fictional examples, including nontechnical writing. Additional coverage lives in the [private eval repository](https://github.com/allagentsdev/agent-plugins-evals-private).
