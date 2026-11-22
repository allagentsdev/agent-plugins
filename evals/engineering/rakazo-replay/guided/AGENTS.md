# Replay workspace
Work on the task in the rakazo repository inside this workspace.

Identify the observed failure and the behavior that must remain intact. Prefer the
smallest change that satisfies both. Before adding shared state, retry policy, or
a new safeguard, name the requirement or credible failure that warrants it.
Defer independent hardening when it has a separate trigger. Keep tests that
exercise the failure at the boundary where it occurs and protect existing
safety behavior.
