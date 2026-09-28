// The only data-access layer for todos.json. Callers never touch the
// underlying array or the file directly — they call the functions below.
//
// File shape on disk: { version: 1, nextId: <int>, tasks: Task[] }
// Task shape: { id, text, done, priority, createdAt, completedAt }

const fs = require("node:fs");
const path = require("node:path");

const VALID_PRIORITIES = ["high", "normal", "low"];
const EMPTY_STATE = { version: 1, nextId: 1, tasks: [] };

class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

// getStorePath() -> string. Resolved on every call (not cached at require
// time) so tests can swap TODO_FILE between cases in the same process.
function getStorePath() {
  return process.env.TODO_FILE || path.join(__dirname, "..", "todos.json");
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function load() {
  const file = getStorePath();
  let raw;

  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      return { ...EMPTY_STATE, tasks: [] };
    }
    throw new AppError("IO_ERROR", `Could not read your to-do list at ${file}: ${err.message}`);
  }

  if (raw.trim() === "") {
    return { ...EMPTY_STATE, tasks: [] };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new AppError(
      "CORRUPT_FILE",
      `Could not read your to-do list at ${file} — the file is not valid JSON. Fix it or delete it to start over.`
    );
  }

  if (!isPlainObject(data) || !Array.isArray(data.tasks) || typeof data.nextId !== "number") {
    throw new AppError(
      "CORRUPT_FILE",
      `Could not read your to-do list at ${file} — the file is not in the expected format. Fix it or delete it to start over.`
    );
  }

  return data;
}

function save(data) {
  const file = getStorePath();
  const tmpFile = `${file}.tmp`;
  const json = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(tmpFile, json, "utf8");
    fs.renameSync(tmpFile, file);
  } catch (err) {
    throw new AppError("IO_ERROR", `Could not save your to-do list to ${file}: ${err.message}`);
  }
}

function normalizePriority(priority) {
  if (priority === undefined) {
    return "normal";
  }
  const lower = String(priority).toLowerCase();
  if (!VALID_PRIORITIES.includes(lower)) {
    throw new AppError(
      "BAD_PRIORITY",
      `Invalid priority: "${priority}" — must be one of: ${VALID_PRIORITIES.join(", ")}.`
    );
  }
  return lower;
}

function listTasks({ filter = "pending" } = {}) {
  const data = load();
  const sorted = [...data.tasks].sort((a, b) => a.id - b.id);

  if (filter === "all") return sorted;
  if (filter === "done") return sorted.filter((t) => t.done);
  return sorted.filter((t) => !t.done);
}

function addTask({ text, priority } = {}) {
  const trimmed = typeof text === "string" ? text.trim() : "";
  if (trimmed === "") {
    throw new AppError("EMPTY_TEXT", "Task text is required.");
  }

  const normalizedPriority = normalizePriority(priority);
  const data = load();

  const task = {
    id: data.nextId,
    text: trimmed,
    done: false,
    priority: normalizedPriority,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  data.tasks.push(task);
  data.nextId += 1;
  save(data);

  return task;
}

function findTaskOrThrow(data, id) {
  const task = data.tasks.find((t) => t.id === id);
  if (!task) {
    throw new AppError("NOT_FOUND", `No task with id ${id}.`);
  }
  return task;
}

function completeTask(id) {
  const data = load();
  const task = findTaskOrThrow(data, id);

  if (task.done) {
    return { task, changed: false };
  }

  task.done = true;
  task.completedAt = new Date().toISOString();
  save(data);

  return { task, changed: true };
}

function removeTask(id) {
  const data = load();
  const task = findTaskOrThrow(data, id);

  data.tasks = data.tasks.filter((t) => t.id !== id);
  save(data);

  return task;
}

function clearCompleted() {
  const data = load();
  const before = data.tasks.length;

  data.tasks = data.tasks.filter((t) => !t.done);
  const removed = before - data.tasks.length;

  if (removed > 0) {
    save(data);
  }

  return removed;
}

module.exports = {
  getStorePath,
  listTasks,
  addTask,
  completeTask,
  removeTask,
  clearCompleted,
  AppError,
};
