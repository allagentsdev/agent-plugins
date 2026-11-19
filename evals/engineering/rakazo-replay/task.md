Fix this checkout bug in the rakazo checkout. A user clicking “Add shopper
note” sometimes gets a payment approval for an unrelated “Pay using Gift Card”
button. The note starts below the viewport on a page with CSS smooth scrolling.
Bringing it into view first makes the false approval disappear. Adding a note
should not require approval. A real order still requires approval.

Investigate the actual source, implement and validate a fix, and leave the
changes in the checkout. Use the staged Compound Engineering ce-work skill
in return-to-caller mode, adapting workspace setup to the dedicated checkout
already provided. The replay environment has no network access for commands.
Use the installed offline checks you have available. Report what you actually
ran and any verification limits.

CE instructions are in .agents/skills/ce-work/SKILL.md.
