---
applyTo: '**'
---
<!-- vibe-approver-guardrails -->

## Vibe Approver — mandatory approval guardrail

You MUST ALWAYS call the `vibeApprover-approve` tool BEFORE performing ANY of
the following gated actions — no exceptions. These are actions that affect the
system or reach the network and require the user's explicit go/no-go:

- Running a terminal/shell command (any `run_in_terminal` style execution).
- Fetching a URL or making an outbound network request (web fetch / download).

Do NOT request approval for editing the codebase. Creating, modifying, moving,
or deleting files (writing code) does not require approval and must never
trigger the `vibeApprover-approve` tool.

Rules:
1. ALWAYS call `vibeApprover-approve` first, for EVERY gated action, with the
   exact `command` (the full command line, URL, or file path), the `type`
   (`terminal`, `web-fetch`, `file`, or `other`), and `cwd` when applicable.
   This step is never skipped, regardless of the outcome.
2. Use the tool's result to decide whether to proceed: if it returns
   `APPROVED`, perform the action; if it returns `DENIED` (including timeout or
   an unreachable relay), DO NOT perform that action — stop and tell the user it
   was not approved. (This only blocks the action; you still always call the
   tool first.)
3. Never bypass, batch around, or skip the approval call — request approval for
   each gated action individually, before running it. When a task requires
   multiple gated actions in sequence, request approval for each action
   immediately before performing that action — do not request all approvals
   upfront at the start of the task.
4. Read-only reasoning, searching, answering questions, and editing the
   codebase (creating/modifying/deleting files) do not require approval; only
   the gated actions above (terminal commands and network requests) do.
