const test = require("node:test");
const assert = require("node:assert");

const { parseArgs } = require("../lib/args");

test("no arguments defaults to the help command", () => {
  const parsed = parseArgs([]);
  assert.strictEqual(parsed.command, "help");
  assert.strictEqual(parsed.error, undefined);
});

test("command names are lowercased", () => {
  const parsed = parseArgs(["ADD", "x"]);
  assert.strictEqual(parsed.command, "add");
});

test("bare positionals join into text with a space", () => {
  const parsed = parseArgs(["add", "Buy", "milk"]);
  assert.strictEqual(parsed.text, "Buy milk");
});

test("quoted text (already one argv entry) is preserved as-is", () => {
  const parsed = parseArgs(["add", "Buy milk"]);
  assert.strictEqual(parsed.text, "Buy milk");
});

test("flags mixed into positionals do not leak into the joined text", () => {
  const parsed = parseArgs(["add", "Buy", "milk", "--priority", "high"]);
  assert.strictEqual(parsed.text, "Buy milk");
  assert.strictEqual(parsed.flags.priority, "high");
});

test("--priority=value form is parsed", () => {
  const parsed = parseArgs(["add", "x", "--priority=high"]);
  assert.strictEqual(parsed.flags.priority, "high");
});

test("-p is a short alias for --priority", () => {
  const parsed = parseArgs(["add", "x", "-p", "high"]);
  assert.strictEqual(parsed.flags.priority, "high");
});

test("--priority with no following value is an error", () => {
  const parsed = parseArgs(["add", "x", "--priority"]);
  assert.match(parsed.error, /needs a value/);
});

test("-p with no following value is an error", () => {
  const parsed = parseArgs(["add", "x", "-p"]);
  assert.match(parsed.error, /needs a value/);
});

test("--all, --done, --pending are recognized boolean flags", () => {
  assert.strictEqual(parseArgs(["list", "--all"]).flags.all, true);
  assert.strictEqual(parseArgs(["list", "--done"]).flags.done, true);
  assert.strictEqual(parseArgs(["list", "--pending"]).flags.pending, true);
});

test("positional id arguments are kept as strings, not numbers", () => {
  const parsed = parseArgs(["done", "5"]);
  assert.strictEqual(parsed.args[0], "5");
  assert.strictEqual(typeof parsed.args[0], "string");
});

test("unknown options produce an error", () => {
  const parsed = parseArgs(["list", "--color"]);
  assert.strictEqual(parsed.error, "Unknown option: --color");
});

test("the parser never throws, for any input", () => {
  const hostileInputs = [
    [],
    [""],
    ["--"],
    ["-"],
    ["--priority"],
    ["-p"],
    ["add", "--priority=", "x"],
    [null],
    ["add", "--", "--priority", "high"],
    ["ADD", "--PRIORITY", "HIGH"],
  ];

  for (const argv of hostileInputs) {
    assert.doesNotThrow(() => parseArgs(argv), `argv=${JSON.stringify(argv)}`);
  }
});
