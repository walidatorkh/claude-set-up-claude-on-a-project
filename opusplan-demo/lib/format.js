// Pure string rendering. No logic beyond turning data into display text —
// no filesystem access, no process.exit. ASCII-only output: no color, no
// Unicode markers, so it renders identically in Windows Terminal, the
// PowerShell ISE, and cmd.exe.

const PRIORITY_WIDTH = "normal".length; // 6

// formatTask(task, maxId) -> "[ ] 1  high    Buy milk"
// maxId is the largest id in the current view, used to right-align the id
// column so ids 9 and 10 keep their text starting in the same place.
function formatTask(task, maxId) {
  const marker = task.done ? "x" : " ";
  const idWidth = String(maxId).length;
  const idStr = String(task.id).padStart(idWidth);
  const priorityStr = task.priority.padEnd(PRIORITY_WIDTH);

  return `[${marker}] ${idStr}  ${priorityStr}  ${task.text}`;
}

// formatSummary({ filter, pending, done }) -> the trailing count line.
function formatSummary({ filter, pending, done }) {
  if (filter === "done") {
    return `${done} done`;
  }
  if (filter === "all") {
    const total = pending + done;
    const taskWord = total === 1 ? "task" : "tasks";
    return `${total} ${taskWord} (${pending} pending, ${done} done)`;
  }
  return `${pending} pending`;
}

function formatClearedMessage(count) {
  if (count === 0) {
    return "Nothing to clear.";
  }
  const taskWord = count === 1 ? "task" : "tasks";
  return `Cleared ${count} completed ${taskWord}.`;
}

function formatEmptyMessage(filter) {
  if (filter === "done") {
    return "No completed tasks yet.";
  }
  if (filter === "all") {
    return 'Your to-do list is empty. Add one with: node index.js add "Buy milk"';
  }
  return 'No pending tasks. Add one with: node index.js add "Buy milk"';
}

function helpText() {
  return [
    "todo - a tiny command-line to-do list",
    "",
    "Usage: node index.js <command> [options]",
    "",
    "Commands:",
    "  add <text>        Add a task.  Options: --priority, -p  (high|normal|low, default normal)",
    "  list              List tasks.  Options: --all, --done, --pending  (default: pending)",
    "  done <id>         Mark a task as done",
    "  remove <id>       Delete a task",
    "  clear             Remove all completed tasks",
    "  help              Show this message",
    "",
    "Environment:",
    "  TODO_FILE         Path to the JSON file (default: <project>/todos.json)",
    "",
    "Examples:",
    '  node index.js add "Buy milk" --priority high',
    "  node index.js list --all",
    "  node index.js done 1",
  ].join("\n");
}

module.exports = {
  formatTask,
  formatSummary,
  formatClearedMessage,
  formatEmptyMessage,
  helpText,
};
