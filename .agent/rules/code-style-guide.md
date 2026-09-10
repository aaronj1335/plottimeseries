---
trigger: always_on
---

# Code style

## Language and runtime

Node.js and TypeScript. Never JavaScript where TypeScript will do.

Run `.ts` files with `node` directly — node strips the types. Do not reach for
`ts-node` or add a build step. Nothing here compiles TypeScript ahead of time,
which is why `erasableSyntaxOnly` is on: no enums, no parameter properties, no
namespaces. They fail at run time otherwise, in the built artifact, with
nothing upstream to catch them.

Annotate what a reader cannot infer at a glance — exported signatures, empty
literals, anything typed `unknown`. Do not restate a type the compiler already
knows from the right-hand side.

Prefer making a thing unrepresentable over asserting it away. `as` is a claim
the compiler cannot check, so a new one needs a reason next to it. The
type-aware linter will reject the ones that turned out to assert nothing.

## Imports

Node built-ins take the `node:` prefix: `import * as fs from 'node:fs'`.

Relative imports carry their file extension: `'./foo.ts'`, `'../bar.tsx'` —
never `'./foo'`. Bundlers resolve the extensionless form and `node foo.ts` does
not, so the extension is the spelling that works everywhere.

An import used only as a type says so, with `import type` or an inline `type`.

Both rules are enforced by `no-restricted-imports`; if the linter is quiet, the
imports are right.

## Comments

Comment the *why*, not the *what*. A comment earns its place when it records
something the code cannot: a constraint from outside the file, a decision with
a discarded alternative, a subtle failure mode.

Prefer a check to a comment. A constraint a build step can test is worth more
as a failing build than as a note someone has to read first, so `npm run
validate` enforces these rather than describing them:

- `scripts/cli.ts` and everything it imports must stay inside the subset of
  TypeScript that scriptc compiles statically — no `throw`, no regular
  expressions, no DOM types. `npm run scriptc:coverage` reports what does not
  compile.
- The bundle must contain no `new Function` or `eval(`, either of which would
  need `'unsafe-eval'` in the CSP. This is why `src/csv.ts` parses the CSV
  itself instead of reaching for `d3.csvParse`.
- Every inline `<script>` and `<style>` in the built page must be covered by a
  CSP hash. The hashes are taken over the exact bytes that end up inline, so
  anything that rewrites those strings after hashing gives a blank page in
  production only.

What is left to a comment is what no check can reach: why the runtime frame
guard in `src/frameGuard.ts` exists when the CSP looks like it should cover
clickjacking, and why the policy in `scripts/securityHeaders.ts` is shaped the
way it is.

Do not narrate. `// increment i` is noise; so is a comment restating the
function name above it.

## Structure

Two TypeScript projects, sharing `tsconfig.base.json`:

- `src/` — browser code. React, the DOM, JSX.
- `scripts/` — Node code. No DOM lib, no JSX.

Keep the pure logic in its own module and the I/O in a thin entry point, the
way `cliOptions.ts` sits under `cli.ts` under `plot-csv.ts`. The pure half is
what gets tested.

When a value's parts are always replaced together, hold them as one value.

## Tests

`node:test` and `node:assert`, in `*.test.ts` / `*.test.tsx` next to the code.
Group with `describe`/`it`; a file of independent checks may use bare `test`.

Component tests render with `renderToStaticMarkup` and compare against the HTML
snapshots in `__snapshots__/`. Update them with
`npm run test:update-snapshots`, and read the diff before committing it — a
changed snapshot is a changed page.

Inject the non-deterministic things (clocks, randomness, the filesystem) so a
test can pin them, rather than mocking modules.

## Checking your work

Run this, without asking first:

    npm run validate

That is the whole of CI in one command: `npm audit`, then lint, typecheck, the
scriptc coverage check, test and a build of `pages-public/`, then smoke checks on the result — including
that every inline `<script>` and `<style>` in the built page is covered by a
CSP hash. Without `unshare` available it warns and runs with the network up.

`npm run lint`, `npm run typecheck` and `npm test` are the individual steps if
you need a faster loop. All three must be clean; the lint has `--max-warnings=0`.
