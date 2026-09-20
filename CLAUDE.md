# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Starter Express API for the Claude Code course. Exposes `/users` and `/health` over an in-memory data store — there is no real database.

## Commands

- `npm install` — install dependencies
- `npm run dev` — start the API on http://localhost:3000 (auto-restarts via `node --watch`)
- `npm start` — start the API without watch mode
- `npm test` — run all tests (Node's built-in `node:test` runner + Supertest)
- `npm run lint` — run ESLint over the whole project

To run a single test file: `node --test tests/users.test.js`.

## Architecture

- `server.js` — creates the Express app, mounts routers, and only calls `app.listen` when run directly (`require.main === module`). This lets `tests/*.test.js` `require("../server")` and hit the app with Supertest without opening a real port.
- `routes/` — one router file per resource (`users.js`, `health.js`), mounted in `server.js` under their path prefix.
- `db/store.js` — the only data access layer. Routes call its functions (`getAllUsers`, `getUserById`, `createUser`) rather than touching the `users` array directly. Data resets on every restart.
- `.env` (git-ignored) holds real config; `.env.example` documents the shape. `PORT` is the only variable currently read (`server.js`).

## Conventions

- New endpoints follow the existing route-file pattern: add a router in `routes/`, mount it in `server.js`, and put any data logic in `db/store.js` instead of inline in the route.
- Validation errors return `400` with `{ error: "..." }`; missing resources return `404` with the same shape (see `routes/users.js`).
