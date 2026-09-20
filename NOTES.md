# NOTES

## CLAUDE.md

I kept it to four lean parts: a one-line project description, the commands I run often (`npm run dev`, `npm test`, `npm run lint`, plus how to run a single test file), two real conventions (route/data-layer separation, and the `400`/`404` error response shape), and a short architecture note on `server.js`, `routes/`, and `db/store.js`.

I omitted the following: anything already obvious from reading the code (such as explaining what Express is or listing file contents line by line), as well as notes on one-off tasks—none of this would have saved time during future work, but would merely have added superfluous text that would eventually become outdated; I also did not duplicate variables from `.env.example` into `CLAUDE.md`.

## Permissions (`.claude/settings.json`)

- **Allow**: `npm test` and `npm run lint` — commands I run constantly, read-only with respect to the repo and the network, so approving them every time added friction with no safety benefit.
- **Ask**: `git push` — affects the shared remote, so I want a chance to glance at it each time rather than auto-approving or auto-blocking.
- **Deny**: reading `./.env` and `git push --force`.
  - Without the `.env` deny rule, Claude could read real secrets into context the first time it went looking for config (e.g. while debugging a `PORT` issue) and there's no legitimate reason it needs the actual values — `.env.example` already documents the shape.
  - Without the force-push deny rule, a bad rebase/merge cleanup could silently overwrite shared history on the remote with no easy recovery.

## Verification

Started a fresh session in the project folder: `/memory` shows `CLAUDE.md` loaded, and `/permissions` shows the allow/ask/deny rules above. Both matched expectations.
