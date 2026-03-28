---
name: conventional-commit-messages
description: Outputs a copy-paste-ready git commit shell command using Conventional Commits. Defaults to multiline messages: subject line plus a body whose main content is rationale (why), often multiple paragraphs. Use when writing commits, before git commit, or when the user asks for a commit message or Conventional Commits.
---

# Conventional commit messages (why over what)

## Goal

Produce a **single runnable shell command** the user can paste into a terminal: `git commit …` with the full message (subject + body). Align with [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): subject`.

- **Subject** (first line): what changed, **imperative**, ~50 chars, no trailing period.
- **Body** (the rest of the message—this should usually be **multiline**): **rationale**—why this change (problem, constraint, decision, tradeoffs). Not a prose version of the diff. Mention **what** only when it clarifies. Prefer several short paragraphs over one cramped line.

## Types (pick one)

| type | Use for |
|------|---------|
| `feat` | New user-visible behavior or API |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, whitespace (no behavior change) |
| `refactor` | Code change that neither fixes nor adds features |
| `perf` | Performance |
| `test` | Tests only |
| `chore` | Tooling, build, deps, CI (no production logic change) |
| `ci` | CI config |
| `build` | Build system or externals |

Use a **scope** when it helps (`feat(scan): …`, `fix(api): …`). Omit if unclear.

## Subject line rules

- Format: `type(scope): imperative description`
- Imperative: "add", "fix", "remove" — not "added", "fixes".
- Lowercase after the colon is fine; be consistent with the repo.

## Body rules (rationale, usually multiline)

**Default expectation:** the commit is **multiline**: one subject line, blank line, then a **description** that is mostly **rationale**.

1. **Start with motivation**: what problem, risk, or requirement drove this?
2. **Then** context: tradeoff, alternative rejected, or constraint (performance, API, compatibility).
3. Use **multiple paragraphs** when helpful (e.g. motivation, then tradeoff)—still concise, not essays.
4. **Avoid** listing every file or restating the patch unless the user needs an audit trail.

**Bad body (what-only):**
"Updated `Scan.tsx` and added `receiptScanApi.ts`."

**Better body (why-forward):**
"Receipt upload failed on large JPEGs because we sent raw bytes without the encoding the backend expects. Align encoding with the API contract so scans succeed on mobile captures."

## Optional footer

- `BREAKING CHANGE: description` or `!` in subject for breaking changes.
- `Refs: #123` if the user supplies an issue id.

## Output format

Always output **one fenced `bash` block** containing a complete `git commit` command—never only the message text.

### Default: multiline message (subject + rationale body)

**Use this in almost all cases.** The message must be **multiline**: subject, blank line, then **rationale** (often 2+ short paragraphs). Use a heredoc so newlines and quoting stay copy-paste safe:

```bash
git commit -F - <<'EOF'
type(scope): short imperative subject

Rationale: what problem or requirement drove this and why this approach.

Further context: tradeoffs, constraints, or alternatives considered if useful.
EOF
```

### Exceptions (rare)

- **Trivial change, no real rationale** (e.g. typo, formatting): single line is OK:

```bash
git commit -m 'docs(readme): fix typo in setup steps'
```

- **Very short body** (one sentence rationale): optional two `-m` form (Git inserts the blank line between subject and body):

```bash
git commit -m 'type(scope): short imperative subject' -m 'One sentence: why this change.'
```

Prefer the **heredoc** whenever the body is more than one sentence or needs line breaks—i.e. **default to heredoc** for normal commits.

### Rules

- Do **not** add `-a` or paths unless the user asked to commit unstaged paths; default is message-only (they stage separately).
- If the message must contain `'` inside a line, heredoc with `<<'EOF'` still works; only avoid breaking the closing `EOF` line.

## Examples

**Input idea:** Added validation on email field.

**Output:**
```bash
git commit -F - <<'EOF'
fix(form): reject invalid email before submit

Invalid addresses were reaching the API and returning generic 400s, which
made it hard to tell user error from server issues.

Validate against the same rules the backend uses so we fail fast in the
form and surface clear field-level feedback.
EOF
```

**Input idea:** Renamed internal helper.

**Output:**
```bash
git commit -F - <<'EOF'
refactor(auth): rename token refresh helper

The old name suggested it only parsed JWTs; it also handles refresh
rotation. Renaming clarifies ownership of the full refresh lifecycle and
reduces the chance we add parsing-only helpers in the wrong module.
EOF
```

## Checklist before returning

- [ ] Subject matches `type(scope):` and imperative mood
- [ ] Message is **multiline by default** with a **rationale-focused** body (heredoc unless trivial)
- [ ] Body emphasizes **why**, not a file list
- [ ] Output is one **runnable** `git commit …` command in a bash fence
