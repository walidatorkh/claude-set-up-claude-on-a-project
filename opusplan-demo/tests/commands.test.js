const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");

const { withTempStore } = require("./helpers");
const { parseArgs } = require("../lib/args");
const { dispatch } = require("../lib/commands");

function run(t, argv) {
  if (t) withTempStore(t);
  return dispatch(parseArgs(argv));
}

test("add creates a task and reports success", (t) => {
  const result = run(t, ["add", "Buy milk"]);
  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /Added #1/);
});

test("add with no text fails and does not create the store file", (t) => {
  const file = withTempStore(t);
  const result = dispatch(parseArgs(["add"]));

  assert.strictEqual(result.code, 1);
  assert.ok(result.err.length > 0);
  assert.strictEqual(fs.existsSync(file), false);
});

test("add with an invalid priority fails and persists nothing", (t) => {
  const file = withTempStore(t);
  const result = dispatch(parseArgs(["add", "x", "--priority", "urgent"]));

  assert.strictEqual(result.code, 1);
  assert.strictEqual(fs.existsSync(file), false);
});

test("list on an empty store shows the friendly empty message", (t) => {
  const result = run(t, ["list"]);
  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /No pending tasks/);
});

test("list shows all pending tasks after three adds", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  dispatch(parseArgs(["add", "b"]));
  dispatch(parseArgs(["add", "c"]));

  const result = dispatch(parseArgs(["list"]));
  assert.strictEqual(result.code, 0);
  assert.strictEqual(result.out.filter((l) => /^\[/.test(l)).length, 3);
});

test("list --done and list --all reflect completion state", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  dispatch(parseArgs(["add", "b"]));
  dispatch(parseArgs(["done", "1"]));

  const doneResult = dispatch(parseArgs(["list", "--done"]));
  assert.strictEqual(doneResult.out.filter((l) => /^\[/.test(l)).length, 1);

  const allResult = dispatch(parseArgs(["list", "--all"]));
  assert.strictEqual(allResult.out.filter((l) => /^\[/.test(l)).length, 2);
});

test("done marks a task complete", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  const result = dispatch(parseArgs(["done", "1"]));

  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /Done #1/);
});

test("done on an already-done task succeeds and says so", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  dispatch(parseArgs(["done", "1"]));
  const result = dispatch(parseArgs(["done", "1"]));

  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /already done/);
});

test("done with no id fails with a usage message", (t) => {
  const result = run(t, ["done"]);
  assert.strictEqual(result.code, 1);
});

test("done rejects non-numeric or non-positive ids", (t) => {
  const badIds = ["abc", "0", "-1", "1.5", "3abc", "0x3"];
  for (const id of badIds) {
    const result = run(t, ["done", id]);
    assert.strictEqual(result.code, 1, `id=${id} should be rejected`);
  }
});

test("done on a nonexistent id fails", (t) => {
  const result = run(t, ["done", "99"]);
  assert.strictEqual(result.code, 1);
});

test("remove deletes a task", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  const result = dispatch(parseArgs(["remove", "1"]));
  assert.strictEqual(result.code, 0);
});

test("remove on a nonexistent id fails", (t) => {
  const result = run(t, ["remove", "99"]);
  assert.strictEqual(result.code, 1);
});

test("clear removes completed tasks and reports the count", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  dispatch(parseArgs(["add", "b"]));
  dispatch(parseArgs(["done", "1"]));
  dispatch(parseArgs(["done", "2"]));

  const result = dispatch(parseArgs(["clear"]));
  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /Cleared 2 completed tasks/);
});

test("clear with nothing to clear succeeds", (t) => {
  withTempStore(t);
  dispatch(parseArgs(["add", "a"]));
  const result = dispatch(parseArgs(["clear"]));

  assert.strictEqual(result.code, 0);
  assert.match(result.out.join("\n"), /Nothing to clear/);
});

test("help exits 0 with usage on stdout and nothing on stderr", (t) => {
  const result = run(t, ["help"]);
  assert.strictEqual(result.code, 0);
  assert.deepStrictEqual(result.err, []);
});

test("no arguments behaves like help", (t) => {
  const result = run(t, []);
  assert.strictEqual(result.code, 0);
});

test("an unknown command fails with output only on stderr", (t) => {
  const result = run(t, ["frobnicate"]);
  assert.strictEqual(result.code, 1);
  assert.ok(result.err.length > 0);
  assert.deepStrictEqual(result.out, []);
});

test("an unknown option fails", (t) => {
  const result = run(t, ["list", "--color"]);
  assert.strictEqual(result.code, 1);
});

test("a corrupt store file yields exit code 2 for any command", (t) => {
  const file = withTempStore(t);
  fs.writeFileSync(file, "{oops");

  for (const argv of [["list"], ["add", "x"], ["done", "1"], ["remove", "1"], ["clear"]]) {
    const result = dispatch(parseArgs(argv));
    assert.strictEqual(result.code, 2, `argv=${JSON.stringify(argv)}`);
  }
});

test("every error result has empty stdout", (t) => {
  withTempStore(t);
  const errorCases = [
    ["frobnicate"],
    ["add"],
    ["done"],
    ["done", "abc"],
    ["done", "99"],
    ["remove", "99"],
    ["list", "--color"],
  ];

  for (const argv of errorCases) {
    const result = dispatch(parseArgs(argv));
    assert.strictEqual(result.code >= 1, true, `argv=${JSON.stringify(argv)}`);
    assert.deepStrictEqual(result.out, [], `argv=${JSON.stringify(argv)}`);
  }
});
