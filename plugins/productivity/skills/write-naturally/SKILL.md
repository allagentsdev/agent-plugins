---
name: write-naturally
description: Write or rewrite messages, reviews, pull-request descriptions, design notes, and technical prose in a direct, evidence-led, natural style. Use when the user asks to "write naturally", "write like a human", "write in my style", polish a comment, or make prose sound natural.
metadata:
  source: https://github.com/allagentsdev/agent-plugins/tree/main/plugins/productivity/skills/write-naturally
---

# Write Naturally

Write or rewrite content in this style without changing its position, intent, or load-bearing factual claims. When the user asks to simplify or change the level of detail, remove facts that do not belong at that level instead of preserving them mechanically.

The voice is direct, technically precise, and proportionate to the medium. It can be a lowercase fragment in chat or a structured engineering argument in a review. Match the register; keep the underlying style.

## The shape

Lead with the point. Then give only the context needed to support it.
When the user asks for plain English, preserve the contract rather than the source's compressed wording. Do not carry unexplained shorthand into the rewrite. Replace it with the responsible actor, observable action and relevant condition; keep the specialist term only after that explanation and only when the reader still needs it.

For technical writing, prefer this order:

1. **Decision or observation.** State what should happen or what is true.
2. **Reason.** Name the concrete cost, constraint, or failure mode.
3. **Evidence.** Include exact behavior, identifiers, links, or verification when available.
4. **Next action.** End with the specific change, question, or approval needed.

Do not force all four parts into short messages. A one-line reply should stay one line.

## Voice

- Direct, calm, and confident.
- Use everyday keyboard punctuation in prose: straight apostrophes (`'`, as in `don't`) and spaced hyphens (` - `) for dashes. Apply this when proofreading too, including punctuation already present in the draft.
- Evidence before reassurance.
- Concrete nouns and exact technical terms.
- Short sentences when the point is simple; compact paragraphs when reasoning is needed.
- One idea per short paragraph when explaining a decision.
- Prefer plain, concrete language around technical detail. Replace shorthand with the behavior it describes when the label is not established for the reader.
- First person where ownership matters: "I think", "we need", "I checked".
- Explicit about tradeoffs: say what the alternative costs and why this option is better.
- Comfortable disagreeing without becoming combative: acknowledge the useful observation, then state the better fix.
- Prefer active voice when ownership matters. Name the actor and action; repeat a load-bearing actor or system name when a pronoun would blur who can do what.
- When the point is a question, ask it directly. Include only context that changes how the reader can answer.
- Uses short parentheticals for practical ownership or access boundaries.

## Register

Match the surface the text will appear on.

### Chat and quick comments

Use the shortest form that still carries the decision. Fragments and lowercase are acceptable when the input is casual. Keep the wording natural rather than polishing it into corporate prose.

Examples:

- `should be final now`
- `closed as superseded by <link>`

Preserve informality; do not manufacture spelling mistakes or unclear grammar.

### Longer documents

Use headings that name the reader's question or the part being changed. Bullets should describe delivered or proposed behavior. Record exact proof where it exists, and separate deliberate exclusions from unfinished work.

### Surface-specific guidance

Read only the reference that applies before drafting:

- For code review comments, pull-request reviews, or technical discussion about a proposed change, read [references/reviews.md](references/reviews.md). It covers questions, caller examples, issue grouping and review status. Establish the assessment through the review; use this skill to express it.
- For technical designs and architecture documents, read [references/technical-designs.md](references/technical-designs.md). It covers the main flow, necessary mechanisms and the boundary between design and implementation detail.

Ordinary messages and other prose use the shared guidance here.

## Reader and current intent

Write for the person receiving the text. After a discussion, use the latest agreed position and the evidence that still supports it. Include only history the recipient needs to understand or act; keep explanations of the drafting process in the conversation with the requester.

Make abstract concerns concrete with a short example when it helps. Show the person affected, the triggering condition, what happens and why it matters. Use supplied evidence for factual examples, label hypothetical illustrations, and claim verification only when it was provided.

Frame recommendations as shared decisions: `We should …` for a requested change or `We can …` for a concrete proposal. Keep the boundary or limit firm; collaborative wording need not make it tentative. These are examples, not required openings. Classify force from the user's description and surrounding context, not grammatical mood alone. When the request identifies the source as a recommendation or proposal, turn a bare imperative into a collaborative statement. Politeness still does not determine force: a sentence beginning `Please keep …` may instead express a command, requirement, or acceptance criterion. Preserve those as obligations rather than recasting them as optional or tentative language.

Use a question when the answer is genuinely needed. When the source intent is a proposal, state it directly rather than turning it into a request for permission; preserve genuine uncertainty and open questions.

When the requester has to paraphrase or ask for clarification, confirm the intended meaning and use that clearer explanation in the revision. Resolve any substantive disagreement before rewriting it as settled. The next reader should understand the point without needing the same clarification.

## Precision

Preserve exact names, paths, code spans, versions, commit hashes, links, counts, and error messages when they matter to the requested surface. Exactness is not a reason to retain irrelevant implementation detail. Never invent evidence or strengthen an uncertain claim.
Treat every retained URL destination as opaque text and copy it character for character. Never retype it from the visible label, infer a canonical repository name, or normalize its punctuation or capitalization.

Preserve the subject and object of every guarantee. Do not replace a precise claim with a nearby abstraction: `prevents duplicate jobs` is not equivalent to `prevents duplicate claims`. When removing detail, join the remaining design without weakening or broadening what it guarantees.

Use certainty deliberately:

- Observed: state it directly and include the proof.
- Inferred: say `I think` and name the evidence.
- Unknown but consequential: ask one focused question.
- Status or urgency: state it when it changes the reader's next action.

## Editing loop

1. Identify the point the reader must leave with.
2. Identify the reader and the document's job. A design, review comment and implementation guide need different levels of detail.
3. Keep every supplied fact that changes a decision, contract, risk, failure mode or next action.
4. Remove facts the intended reader can safely infer, plus repetition, generic reassurance, throat-clearing and ceremony.
5. Put parallel details into bullets; keep causal reasoning in prose.
6. For a longer document, check that the opening establishes the subject and each explanation appears where the reader needs it.
7. Build a private checklist of source guarantees expressed with `must`, `never`, `only`, `prevents`, `cannot` or equivalent language. Confirm the rewrite preserves the same actor, action and object for each one. A related mechanism does not count as the same guarantee. Compare exact identifiers, numbers and link destinations character for character when they remain in scope.
8. Read the result once for voice and once for level of detail. It should sound like a colleague explaining the subject.
9. Check boundary words separately: `all`, `any`, `before`, `after`, `exactly`, `at most`, units, and scope such as one attempt versus the whole request. Smoother wording is wrong if it changes the threshold. `Uses the remaining allowance` does not preserve `uses all the remaining allowance`.
10. When plain English is requested, inspect the result for source shorthand such as `I/O`, `invariant`, `surface`, `pre-call` or an unexplained accounting label. Replace it with behavior or define it through a concrete example. A polished label still fails if the reader must decode it.
11. Read it from the recipient's position: can they understand the point, evidence and next action without the drafting conversation?

## Guardrails

- Preserve the user's meaning. Do not add scope, evidence, or commitments.
- Keep criticism about the implementation or decision, not the person.
- Use headings only when they make a longer message easier to scan.
- Avoid filler openings such as `Certainly`, `Here is`, or `I hope this helps`.
- Avoid corporate phrasing, motivational language, and inflated adjectives.
- Avoid repeating a conclusion as a closing summary.
- Return only the rewritten text unless the user asks for commentary or alternatives.

## Done when

- The conclusion appears before its supporting detail.
- Every sentence contributes a fact, decision, reason, risk, or next action.
- The level of formality matches the destination.
- Technical claims remain exactly as grounded as the source.
- The reader can follow the behavior and its consequences on the first read, without losing a necessary constraint or caveat.
