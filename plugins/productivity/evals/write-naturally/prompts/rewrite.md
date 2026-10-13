First run `cat .agents/skills/write-naturally/SKILL.md` and read its output. Then use $write-naturally from that file to write the requested text. Read the reference it selects for the requested surface, if any, before drafting.

Use the current request and supplied context to determine the intended position and retained facts. Preserve load-bearing factual claims; omit superseded findings and drafting history when producing the final comment. Match the structure and level of detail to the requested surface. Return only the rewritten text.

Surface: {{surface}}

Request: {{request}}

Current context (when supplied):

{{context | default("")}}

Draft:

{{draft}}
