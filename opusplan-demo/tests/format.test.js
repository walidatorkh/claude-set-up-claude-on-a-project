const test = require("node:test");
const assert = require("node:assert");

const format = require("../lib/format");

function task(overrides) {
  return {
    id: 1,
    text: "Buy milk",
    done: false,
    priority: "normal",
    createdAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

test("formatTask renders a pending high-priority task", () => {
  const line = format.formatTask(task({ id: 1, priority: "high", text: "Buy milk" }), 1);
  assert.strictEqual(line, "[ ] 1  high    Buy milk");
});

test("formatTask uses an [x] marker for done tasks", () => {
  const line = format.formatTask(task({ id: 2, done: true, text: "Email the landlord" }), 2);
  assert.strictEqual(line, "[x] 2  normal  Email the landlord");
});

test("formatTask pads the priority column to the width of 'normal'", () => {
  const high = format.formatTask(task({ id: 1, priority: "high", text: "a" }), 2);
  const low = format.formatTask(task({ id: 1, priority: "low", text: "a" }), 2);
  assert.strictEqual(high, "[ ] 1  high    a");
  assert.strictEqual(low, "[ ] 1  low     a");
});

test("formatTask aligns text when ids 9 and 10 appear in the same list (widthOfMaxId = 2)", () => {
  const nine = format.formatTask(task({ id: 9, priority: "normal", text: "Water the plants" }), 10);
  const ten = format.formatTask(task({ id: 10, priority: "high", text: "Renew passport" }), 10);

  const textColumnStart = (line) => line.indexOf("normal") >= 0
    ? line.indexOf("Water")
    : line.indexOf("Renew");

  assert.strictEqual(textColumnStart(nine), textColumnStart(ten));
});

test("formatSummary for the pending filter", () => {
  assert.strictEqual(format.formatSummary({ filter: "pending", pending: 2, done: 1 }), "2 pending");
});

test("formatSummary for the all filter", () => {
  assert.strictEqual(format.formatSummary({ filter: "all", pending: 2, done: 1 }), "3 tasks (2 pending, 1 done)");
});

test("formatSummary for the done filter", () => {
  assert.strictEqual(format.formatSummary({ filter: "done", pending: 2, done: 1 }), "1 done");
});

test("formatSummary uses singular forms for count 1", () => {
  assert.strictEqual(format.formatSummary({ filter: "pending", pending: 1, done: 0 }), "1 pending");
  assert.strictEqual(format.formatSummary({ filter: "done", pending: 0, done: 1 }), "1 done");
});

test("formatClearedMessage pluralizes correctly", () => {
  assert.strictEqual(format.formatClearedMessage(1), "Cleared 1 completed task.");
  assert.strictEqual(format.formatClearedMessage(2), "Cleared 2 completed tasks.");
  assert.strictEqual(format.formatClearedMessage(0), "Nothing to clear.");
});

test("formatEmptyMessage differs per filter", () => {
  const pending = format.formatEmptyMessage("pending");
  const done = format.formatEmptyMessage("done");
  const all = format.formatEmptyMessage("all");

  assert.match(pending, /No pending tasks/);
  assert.match(done, /No completed tasks/);
  assert.match(all, /empty/);
  assert.notStrictEqual(pending, done);
  assert.notStrictEqual(done, all);
});

test("helpText mentions every command and TODO_FILE", () => {
  const help = format.helpText();
  for (const command of ["add", "list", "done", "remove", "clear", "help"]) {
    assert.ok(help.includes(command), `help text should mention "${command}"`);
  }
  assert.ok(help.includes("TODO_FILE"));
});

test("no formatted output contains non-ASCII characters (Windows console safety)", () => {
  const lines = [
    format.formatTask(task({ priority: "high" }), 1),
    format.formatTask(task({ done: true }), 1),
    format.formatSummary({ filter: "all", pending: 1, done: 1 }),
    format.formatClearedMessage(1),
    format.formatClearedMessage(0),
    format.formatEmptyMessage("pending"),
    format.formatEmptyMessage("done"),
    format.formatEmptyMessage("all"),
    format.helpText(),
  ];

  for (const line of lines) {
    assert.doesNotMatch(line, /[^\x20-\x7E\n]/, `non-ASCII character found in: ${JSON.stringify(line)}`);
  }
});
