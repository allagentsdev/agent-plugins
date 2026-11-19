Run the {{persona}} reviewer pass from Compound Engineering on the supplied material. First read .agents/skills/{{skill}}/SKILL.md and .agents/skills/{{skill}}/references/personas/{{persona}}.md in the eval workspace. Use a recognizable file read such as `cat` on these paths.

This fixture supplies the evidence packet for one reviewer pass. Use the persona's review criteria directly. The eval does not provide the parent workflow's scripts, other reviewers, or repository. Return the review in your response. Do not write files, delegate, or fetch external evidence.

Give the disposition and the concrete findings or reasons for accepting the approach. State what you would ship or change and what would verify it. Identify unverified risks when they matter to your decision.

{% if skill == "ce-doc-review" %}
<review-context>
Document type: plan
Origin: none
</review-context>
{% endif %}

{{scenario}}
