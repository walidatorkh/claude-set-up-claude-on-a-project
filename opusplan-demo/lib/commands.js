// One handler per command, plus dispatch(). Handlers return
// { code, out, err } and never print or call process.exit — index.js is
// the only place that touches the real process/streams.

const store = require("./store");
const format = require("./format");

const HINT = 'Run "node index.js help" to see available commands.';

const EXIT_FOR_APP_ERROR = {
  CORRUPT_FILE: 2,
  IO_ERROR: 2,
  EMPTY_TEXT: 1,
  BAD_PRIORITY: 1,
  NOT_FOUND: 1,
};

function ok(out = []) {
  return { code: 0, out: Array.isArray(out) ? out : [out], err: [] };
}

function fail(code, err) {
  return { code, out: [], err: Array.isArray(err) ? err : [err] };
}

// Validates a raw id argument. Digits only, no sign, no decimal point, no
// leading "0x" — checked on the raw string before any Number() coercion,
// since Number(" 3 "), Number("0x3"), and parseInt("3abc") all "succeed"
// in ways that would silently accept garbage input.
function parseId(raw) {
  if (raw === undefined) {
    return { error: "Usage: node index.js <done|remove> <id>" };
  }
  if (!/^[0-9]+$/.test(raw)) {
    return { error: `Invalid id: "${raw}" — id must be a positive whole number.` };
  }
  const id = Number(raw);
  if (id <= 0) {
    return { error: `Invalid id: "${raw}" — id must be a positive whole number.` };
  }
  return { id };
}

function resolveFilter(flags) {
  if (flags.all) return "all";
  if (flags.done) return "done";
  return "pending";
}

function add(parsed) {
  const task = store.addTask({ text: parsed.text, priority: parsed.flags.priority });
  return ok(`Added #${task.id}: ${task.text} (${task.priority})`);
}

function list(parsed) {
  const filter = resolveFilter(parsed.flags);
  const tasks = store.listTasks({ filter });

  if (tasks.length === 0) {
    return ok(format.formatEmptyMessage(filter));
  }

  const maxId = Math.max(...tasks.map((t) => t.id));
  const lines = tasks.map((t) => format.formatTask(t, maxId));

  const allForCounts = filter === "all" ? tasks : store.listTasks({ filter: "all" });
  const pending = allForCounts.filter((t) => !t.done).length;
  const done = allForCounts.filter((t) => t.done).length;

  lines.push("");
  lines.push(format.formatSummary({ filter, pending, done }));

  return ok(lines);
}

function done(parsed) {
  const { id, error } = parseId(parsed.args[0]);
  if (error) return fail(1, error);

  const result = store.completeTask(id);
  if (!result.changed) {
    return ok(`#${id} is already done.`);
  }
  return ok(`Done #${id}: ${result.task.text}`);
}

function remove(parsed) {
  const { id, error } = parseId(parsed.args[0]);
  if (error) return fail(1, error);

  const task = store.removeTask(id);
  return ok(`Removed #${task.id}: ${task.text}`);
}

function clear() {
  const count = store.clearCompleted();
  return ok(format.formatClearedMessage(count));
}

function help() {
  return ok(format.helpText());
}

const handlers = { add, list, done, remove, clear, help };

function dispatch(parsed) {
  if (parsed.error) {
    return fail(1, [parsed.error, HINT]);
  }

  const handler = handlers[parsed.command];
  if (!handler) {
    return fail(1, [`Unknown command: ${parsed.command}`, HINT]);
  }

  try {
    return handler(parsed);
  } catch (err) {
    if (err instanceof store.AppError) {
      const code = EXIT_FOR_APP_ERROR[err.code] || 1;
      return fail(code, err.message);
    }
    throw err;
  }
}

module.exports = { dispatch };
