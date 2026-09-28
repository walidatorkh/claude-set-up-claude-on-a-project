const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { withTempStore } = require("./helpers");
const store = require("../lib/store");

test("getStorePath() resolves inside the OS temp directory during tests", (t) => {
  const file = withTempStore(t);
  assert.strictEqual(store.getStorePath(), file);
  assert.ok(
    path.resolve(store.getStorePath()).startsWith(path.resolve(os.tmpdir())),
    "test store path must live under os.tmpdir() so the real todos.json is never touched"
  );
});

// --- Reading / empty states -------------------------------------------------

test("listTasks() on a missing file returns [] and does not create the file", (t) => {
  const file = withTempStore(t);
  const tasks = store.listTasks({ filter: "all" });
  assert.deepStrictEqual(tasks, []);
  assert.strictEqual(fs.existsSync(file), false);
});

test("listTasks() on a 0-byte file returns []", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, "");
  assert.deepStrictEqual(store.listTasks({ filter: "all" }), []);
});

test("listTasks() on a whitespace-only file returns []", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, "   \n\t  ");
  assert.deepStrictEqual(store.listTasks({ filter: "all" }), []);
});

test("invalid JSON throws AppError CORRUPT_FILE", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, "{oops");
  assert.throws(() => store.listTasks({ filter: "all" }), (err) => {
    assert.ok(err instanceof store.AppError);
    assert.strictEqual(err.code, "CORRUPT_FILE");
    assert.ok(err.message.includes(file));
    return true;
  });
});

test("a top-level JSON array is CORRUPT_FILE", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, "[]");
  assert.throws(() => store.listTasks({ filter: "all" }), { code: "CORRUPT_FILE" });
});

test("tasks not being an array is CORRUPT_FILE", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, JSON.stringify({ version: 1, nextId: 1, tasks: "nope" }));
  assert.throws(() => store.listTasks({ filter: "all" }), { code: "CORRUPT_FILE" });
});

// --- Adding ------------------------------------------------------------------

test("addTask() returns a fully-populated task", (t) => {
  withTempStore(t);
  const task = store.addTask({ text: "Buy milk" });

  assert.strictEqual(task.id, 1);
  assert.strictEqual(task.text, "Buy milk");
  assert.strictEqual(task.done, false);
  assert.strictEqual(task.priority, "normal");
  assert.strictEqual(task.completedAt, null);
  assert.match(task.createdAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("addTask() persists so a later listTasks() sees it", (t) => {
  withTempStore(t);
  store.addTask({ text: "Buy milk" });
  const tasks = store.listTasks({ filter: "all" });
  assert.strictEqual(tasks.length, 1);
  assert.strictEqual(tasks[0].text, "Buy milk");
});

test("addTask() trims surrounding whitespace from text", (t) => {
  withTempStore(t);
  const task = store.addTask({ text: "  Buy milk  " });
  assert.strictEqual(task.text, "Buy milk");
});

test("addTask() rejects empty text", (t) => {
  withTempStore(t);
  assert.throws(() => store.addTask({ text: "" }), { code: "EMPTY_TEXT" });
});

test("addTask() rejects whitespace-only text", (t) => {
  withTempStore(t);
  assert.throws(() => store.addTask({ text: "   " }), { code: "EMPTY_TEXT" });
});

test("addTask() normalizes priority case", (t) => {
  withTempStore(t);
  const task = store.addTask({ text: "x", priority: "HIGH" });
  assert.strictEqual(task.priority, "high");
});

test("addTask() rejects an invalid priority", (t) => {
  withTempStore(t);
  assert.throws(() => store.addTask({ text: "x", priority: "urgent" }), { code: "BAD_PRIORITY" });
});

test("ids increment 1, 2, 3", (t) => {
  withTempStore(t);
  const a = store.addTask({ text: "a" });
  const b = store.addTask({ text: "b" });
  const c = store.addTask({ text: "c" });
  assert.deepStrictEqual([a.id, b.id, c.id], [1, 2, 3]);
});

test("ids are never reused after a remove", (t) => {
  withTempStore(t);
  store.addTask({ text: "a" });
  store.addTask({ text: "b" });
  store.removeTask(2);
  const c = store.addTask({ text: "c" });
  assert.strictEqual(c.id, 3);
});

test("nextId is persisted in the written file", (t) => {
  const file = withTempStore(t);
  store.addTask({ text: "a" });
  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(onDisk.nextId, 2);
});

// --- Listing -----------------------------------------------------------------

test("listTasks() defaults to pending only", (t) => {
  withTempStore(t);
  const a = store.addTask({ text: "a" });
  store.addTask({ text: "b" });
  store.completeTask(a.id);

  const pending = store.listTasks();
  assert.strictEqual(pending.length, 1);
  assert.strictEqual(pending[0].text, "b");
});

test("listTasks({ filter: 'done' }) returns only completed tasks", (t) => {
  withTempStore(t);
  const a = store.addTask({ text: "a" });
  store.addTask({ text: "b" });
  store.completeTask(a.id);

  const done = store.listTasks({ filter: "done" });
  assert.strictEqual(done.length, 1);
  assert.strictEqual(done[0].text, "a");
});

test("listTasks({ filter: 'all' }) returns everything in ascending id order", (t) => {
  withTempStore(t);
  store.addTask({ text: "a" });
  store.addTask({ text: "b" });
  store.addTask({ text: "c" });

  const all = store.listTasks({ filter: "all" });
  assert.deepStrictEqual(all.map((t2) => t2.id), [1, 2, 3]);
});

// --- Completing ----------------------------------------------------------------

test("completeTask() marks a task done and stamps completedAt", (t) => {
  withTempStore(t);
  const task = store.addTask({ text: "a" });
  const result = store.completeTask(task.id);

  assert.strictEqual(result.changed, true);
  assert.strictEqual(result.task.done, true);
  assert.match(result.task.completedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("completeTask() on an already-done task is a no-op with changed:false", (t) => {
  withTempStore(t);
  const task = store.addTask({ text: "a" });
  const first = store.completeTask(task.id);
  const second = store.completeTask(task.id);

  assert.strictEqual(second.changed, false);
  assert.strictEqual(second.task.completedAt, first.task.completedAt);
});

test("completeTask() on a nonexistent id throws NOT_FOUND", (t) => {
  withTempStore(t);
  assert.throws(() => store.completeTask(99), { code: "NOT_FOUND" });
});

// --- Removing / clearing --------------------------------------------------------

test("removeTask() returns the removed task and it disappears from listTasks", (t) => {
  withTempStore(t);
  store.addTask({ text: "a" });
  const b = store.addTask({ text: "b" });

  const removed = store.removeTask(b.id);
  assert.strictEqual(removed.id, b.id);
  assert.strictEqual(removed.text, "b");

  const all = store.listTasks({ filter: "all" });
  assert.strictEqual(all.some((t2) => t2.id === b.id), false);
});

test("removeTask() on a nonexistent id throws NOT_FOUND", (t) => {
  withTempStore(t);
  assert.throws(() => store.removeTask(99), { code: "NOT_FOUND" });
});

test("clearCompleted() removes only done tasks and returns the count", (t) => {
  withTempStore(t);
  const a = store.addTask({ text: "a" });
  store.addTask({ text: "b" });
  store.completeTask(a.id);

  const count = store.clearCompleted();
  assert.strictEqual(count, 1);

  const all = store.listTasks({ filter: "all" });
  assert.strictEqual(all.length, 1);
  assert.strictEqual(all[0].text, "b");
});

test("clearCompleted() with nothing done returns 0 without throwing", (t) => {
  withTempStore(t);
  store.addTask({ text: "a" });
  assert.strictEqual(store.clearCompleted(), 0);
});

// --- Persistence mechanics --------------------------------------------------

test("no .tmp file remains after a successful write", (t) => {
  const file = withTempStore(t);
  store.addTask({ text: "a" });
  const dir = path.dirname(file);
  const leftovers = fs.readdirSync(dir).filter((name) => name.endsWith(".tmp"));
  assert.deepStrictEqual(leftovers, []);
});

test("the written file has the expected top-level shape", (t) => {
  const file = withTempStore(t);
  store.addTask({ text: "a" });
  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(onDisk.version, 1);
  assert.strictEqual(typeof onDisk.nextId, "number");
  assert.ok(Array.isArray(onDisk.tasks));
});

test("getStorePath() reflects a TODO_FILE change made after the module was required", (t) => {
  const previous = process.env.TODO_FILE;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-"));
  const file = path.join(dir, "other.json");
  process.env.TODO_FILE = file;

  t.after(() => {
    if (previous === undefined) {
      delete process.env.TODO_FILE;
    } else {
      process.env.TODO_FILE = previous;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  assert.strictEqual(store.getStorePath(), file);
});

test("writing into a nonexistent directory throws a readable IO_ERROR", (t) => {
  const previous = process.env.TODO_FILE;
  const missingDir = path.join(os.tmpdir(), "todo-does-not-exist-" + Date.now(), "nested");
  process.env.TODO_FILE = path.join(missingDir, "todos.json");

  t.after(() => {
    if (previous === undefined) {
      delete process.env.TODO_FILE;
    } else {
      process.env.TODO_FILE = previous;
    }
  });

  assert.throws(() => store.addTask({ text: "a" }), { code: "IO_ERROR" });
});
