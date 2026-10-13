# Technical designs and architecture documents

Choose the document’s abstraction level before editing. A design explains behavior, boundaries and the mechanisms needed to support its guarantees.

## Explain the design before specifying its rules

Open with what the system does today, what changes, and what stays the same. Give the reader a working picture before introducing detailed invariants. Prefer a short sequence of actor-and-action steps for the main flow.

For a system with three or more ordered steps, always give the end-to-end sequence its own `Main flow` or equivalent section before the detailed rules. Do not leave the sequence under `Purpose` or mix it into `Design decisions`. Keep actor counts separate from flow steps: if a sentence says there are two actors, list only those two actors beneath it.

- Use complete, conversational sentences in documents. Chat fragments are a different register; terseness is not the goal.
- Explain each mechanism where it becomes relevant: what happens, why it is needed, and what happens if it fails. Keep the condition and consequence together.
- Let concrete behavior carry the decision. On a plain-English pass, replace a specialist label that is standing in for the explanation. Name the actor, action and condition first. Keep the label only when it helps later discussion.
- Do not let a familiar label choose an implementation that the design has not chosen. State the observable arithmetic requirement and a concrete operation separately from the storage or number representation. For example, `The calculator must produce exactly 1 when it adds 1/3 and 2/3` defines behavior without choosing decimal, rational, or scaled-integer storage. Exact arithmetic alone does not imply base 10 or fixed point. Name `decimal`, `fixed-point`, scaled integers, rationals, or another representation only when the source selects it, and preserve any selected scale or encoding. Saying only that this "avoids rounding errors" is not enough.
- Translate compressed boundaries into the responsible actor, observable action, relevant condition and consequence. A familiar verb is not an explanation: for a quantitative boundary, state the exact comparison and scope instead of leaving words such as `exhausts` to carry the rule. For a count guarantee, name the actor, the maximum number of actions and the scope of that count. Prefer `If the signature check fails, the upload service stores no file and returns a validation error` to `uploads fail before persistence`, and `For each scheduled job, the dispatcher sends at most one notification` to `single-delivery safety is established`.
- Keep formulas and exact identifiers when they define the contract. Explain what their inputs mean and what decision follows; do not replace a precise formula with a loose summary.
- Use numbered lists for ordered steps, bullets for parallel changes or requirements, and tables for repeated fields the reader needs to compare. Keep causal reasoning in paragraphs.
- Give each rule one main home. Repeat it in an overview or acceptance check only when that helps navigation or verification; each section should add something.
- Keep the exact constraints, failure cases and uncertainty. Simplify the explanation, not the design; readability is not a reason to change retry behavior, guarantees or scope.

For example, expand a compressed rule such as `Delivery never reopens execution` into behavior:

> Once the worker has saved the result, it retries delivery without running the job again. Each retry sends the stored request bytes with the same idempotency key.

The extra words earn their place by explaining what the worker does. Aim for understanding on the first read, not the fewest words.

## Keep a design above the code

A design document tells reviewers which behavior and boundaries the implementation must preserve. The pull request and code show how the current implementation achieves them. Keep that division firm.

Before drafting a DBD, silently classify each source detail as a design decision, necessary mechanism, implementation plumbing, or tautology. Keep the first two. Delete the last two, even when they are factually true. Do not mention or summarize what you deleted.

Keep details that affect the design:

- actor ownership, state transitions and externally visible contracts;
- ordering, concurrency, durability and retry guarantees;
- trust, permission and data-handling boundaries;
- failure conditions and their consequences;
- compatibility, migration and deliberate scope limits; and
- enough mechanism to make a non-obvious guarantee credible.

For a design, remove details that only describe the current plumbing:

- SDK options, constructor flags, middleware classes and dependency-injection wiring;
- helper method names, object-lifetime chores and local test-fixture setup;
- defaults or safeguards that this design neither introduces nor changes;
- environment labels such as "development and integration" when the distinction has no defined effect; and
- statements that follow automatically from a rule already stated.

Delete vague configuration statements rather than generalizing them. `Required tools are supplied through configuration` is no more useful than `Development and integration configuration provides the required tools` unless the document names a setting or policy that changes the design.

Apply the senior-engineer inference test to every detail. If a reviewer can derive it from the design and normal codebase conventions, and removing it changes no decision, contract, risk or failure mode, delete it. Do not merely rephrase it.

Keep the document connected to the codebase without turning it into an implementation guide. Preserve exact identifiers only when they name a stable contract, Activity, state, configuration field or component that the reviewer must locate. Explain an unfamiliar identifier through its behavior on first use. Remove SDK types, methods and options that only prove how the current code implements the design.

Explain non-obvious mechanisms at the level needed to answer "how can the system guarantee that?" Do not stop at a compressed label. `Concurrently` names an outcome; it does not explain how the Workflow produces it. For example:

- Instead of `Calls from one response run concurrently`, write: `The workflow schedules every call in the response before waiting, then records the results in the model's order.` Do not substitute `schedules all calls concurrently`; the schedule-before-wait mechanism is the design.
- Instead of `Schedule no calls from a batch that would exceed a limit`, write: `Before scheduling, compare the batch size with the remaining allowance. If it does not fit, schedule none.`
- Instead of naming model SDK flags and middleware classes, write the boundary they enforce: `The model Activity receives tool declarations but cannot execute tools.`

After stating the model/tool boundary, delete the SDK proof of that boundary. Do not retain `ChatOptions.Tools`, `FunctionInvokingChatClient`, `UseProvidedChatClientAsIs`, or equivalent option and middleware names anywhere in a DBD, including explanatory follow-up sentences.

If the source says an existing adapter already applies `MaxOutputTokens` and the design does not change it, omit that sentence. The output contract may still matter; keep its validation rule once, but remove a second sentence that merely restates it for the no-tool branch.

During the final pass, delete any sentence that conditions final-response validity on the absence of tool calls when the output contract already defines validation. This includes paraphrases such as `A response without tool calls must contain a valid final object` and `The model must return a valid final object when it does not request tools`. Rephrasing an obvious statement does not make it useful.

The target is design-level mechanism: more concrete than a slogan, less detailed than the implementation. When the requested surface is a DBD, this abstraction rule overrides a general preference to preserve every exact identifier from the draft.
