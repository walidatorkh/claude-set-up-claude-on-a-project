# todo

A tiny command-line to-do list. Zero runtime dependencies — `node index.js`
and `node --test` both work on a bare checkout with no `npm install`.
Installing dependencies is only needed to run the linter.

## Usage

```
node index.js add <text>        Add a task.  Options: --priority, -p  (high|normal|low, default normal)
node index.js list              List tasks.  Options: --all, --done, --pending  (default: pending)
node index.js done <id>         Mark a task as done
node index.js remove <id>       Delete a task
node index.js clear             Remove all completed tasks
node index.js help              Show usage
```

Examples:

```powershell
node index.js add "Buy milk" --priority high
node index.js list
node index.js done 1
node index.js list --all
node index.js clear
```

## Data file

Tasks are stored in `todos.json` next to this project (git-ignored — it's
your data, not a fixture). Override the location with the `TODO_FILE`
environment variable, e.g.:

```powershell
$env:TODO_FILE = "$env:TEMP\my-todos.json"
```

## Exit codes

- `0` — success (including "nothing to do" cases like `done` on an
  already-done task, or `clear` with nothing to clear)
- `1` — user error (bad command, bad id, missing/invalid text or priority)
- `2` — environment error (the JSON file is missing/unreadable/corrupt)

## Tests

```powershell
node --test              # whole suite
node --test tests\store.test.js   # a single file
```

Tests are hermetic: each one runs against a throwaway file inside the OS
temp directory and never touches your real `todos.json`.

## Lint

```powershell
npm install
npm run lint
```
