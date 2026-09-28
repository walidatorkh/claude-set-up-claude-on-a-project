const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const indexPath = path.join(__dirname, "..", "index.js");

function runCli(args, { todoFile }) {
  return spawnSync(process.execPath, [indexPath, ...args], {
    env: { ...process.env, TODO_FILE: todoFile },
    encoding: "utf8",
  });
}

function withTempFile(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-cli-"));
  const file = path.join(dir, "todos.json");
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return file;
}

test("help exits 0 with usage on stdout and empty stderr", (t) => {
  const file = withTempFile(t);
  const result = runCli(["help"], { todoFile: file });

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage/);
  assert.strictEqual(result.stderr, "");
});

test("no arguments also shows usage and exits 0", (t) => {
  const file = withTempFile(t);
  const result = runCli([], { todoFile: file });

  assert.strictEqual(result.status, 0);
  assert.match(result.stdout, /Usage/);
});

test("a task added in one process is visible to list in another process", (t) => {
  const file = withTempFile(t);

  const addResult = runCli(["add", "Buy milk", "--priority", "high"], { todoFile: file });
  assert.strictEqual(addResult.status, 0);

  const listResult = runCli(["list"], { todoFile: file });
  assert.strictEqual(listResult.status, 0);
  assert.match(listResult.stdout, /Buy milk/);
});

test("an unknown command exits 1 with stderr output and empty stdout", (t) => {
  const file = withTempFile(t);
  const result = runCli(["frobnicate"], { todoFile: file });

  assert.strictEqual(result.status, 1);
  assert.notStrictEqual(result.stderr, "");
  assert.strictEqual(result.stdout, "");
});

test("add with no text exits 1", (t) => {
  const file = withTempFile(t);
  const result = runCli(["add"], { todoFile: file });
  assert.strictEqual(result.status, 1);
});

test("after add, the store file exists with the expected shape", (t) => {
  const file = withTempFile(t);
  runCli(["add", "Buy milk"], { todoFile: file });

  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(onDisk.tasks.length, 1);
  assert.strictEqual(typeof onDisk.nextId, "number");
});

test("a corrupted store file makes list exit 2", (t) => {
  const file = withTempFile(t);
  fs.writeFileSync(file, "{oops");

  const result = runCli(["list"], { todoFile: file });
  assert.strictEqual(result.status, 2);
});

test("unquoted multi-word text is joined into a single task", (t) => {
  const file = withTempFile(t);
  runCli(["add", "Buy", "milk"], { todoFile: file });

  const onDisk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(onDisk.tasks[0].text, "Buy milk");
});

test("stdout never contains a raw ESC byte", (t) => {
  const file = withTempFile(t);
  runCli(["add", "Buy milk"], { todoFile: file });
  const result = runCli(["list", "--all"], { todoFile: file });

  assert.strictEqual(result.stdout.includes("\x1b"), false);
});
