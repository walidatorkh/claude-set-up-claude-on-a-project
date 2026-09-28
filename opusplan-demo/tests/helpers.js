// Test helper: gives each test its own throwaway store file inside the OS
// temp directory, and restores TODO_FILE afterwards. Never touches the
// project's real todos.json.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// withTempStore(t) creates a fresh temp dir, points TODO_FILE at a file
// inside it for the duration of the test, and registers cleanup via
// t.after(). Returns the resolved store file path.
function withTempStore(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-"));
  const file = path.join(dir, "todos.json");
  const previous = process.env.TODO_FILE;

  process.env.TODO_FILE = file;

  t.after(() => {
    if (previous === undefined) {
      delete process.env.TODO_FILE;
    } else {
      process.env.TODO_FILE = previous;
    }
    fs.rmSync(dir, { recursive: true, force: true });
  });

  return file;
}

module.exports = { withTempStore };
