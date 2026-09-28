// Pure argv parser. Never touches the filesystem and never throws — any
// problem with the input is reported via the returned `error` string so
// the caller can turn it into a normal exit-1 result.

const VALUE_FLAGS = {
  "--priority": "priority",
  "-p": "priority",
};

const BOOLEAN_FLAGS = {
  "--all": "all",
  "--done": "done",
  "--pending": "pending",
};

// parseArgs(argv) -> {
//   command: string,           // lowercased, "help" when argv is empty
//   args: string[],            // positional arguments after the command,
//                              // excluding anything consumed by flags
//   text: string,              // args joined with a single space (for `add`)
//   flags: { priority?, all?, done?, pending? },
//   error?: string,            // set when argv could not be parsed
// }
function parseArgs(argv) {
  const list = Array.isArray(argv) ? argv : [];
  const command = list.length > 0 ? String(list[0]).toLowerCase() : "help";
  const rest = list.slice(1);

  const args = [];
  const flags = {};

  for (let i = 0; i < rest.length; i += 1) {
    const raw = String(rest[i]);

    if (raw === "--") {
      // Everything after a bare "--" is treated as literal positionals.
      for (let j = i + 1; j < rest.length; j += 1) {
        args.push(String(rest[j]));
      }
      break;
    }

    const eqIndex = raw.startsWith("--") ? raw.indexOf("=") : -1;
    const name = eqIndex === -1 ? raw : raw.slice(0, eqIndex);
    const inlineValue = eqIndex === -1 ? undefined : raw.slice(eqIndex + 1);

    if (Object.prototype.hasOwnProperty.call(VALUE_FLAGS, name)) {
      const key = VALUE_FLAGS[name];
      let value = inlineValue;

      if (value === undefined) {
        const next = rest[i + 1];
        if (next === undefined || String(next).startsWith("-")) {
          return { command, args, text: args.join(" "), flags, error: `Option ${name} needs a value.` };
        }
        value = String(next);
        i += 1;
      }

      if (value === "") {
        return { command, args, text: args.join(" "), flags, error: `Option ${name} needs a value.` };
      }

      flags[key] = value;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(BOOLEAN_FLAGS, name)) {
      flags[BOOLEAN_FLAGS[name]] = true;
      continue;
    }

    if (raw.startsWith("-") && raw !== "-") {
      return { command, args, text: args.join(" "), flags, error: `Unknown option: ${name}` };
    }

    args.push(raw);
  }

  return { command, args, text: args.join(" "), flags };
}

module.exports = { parseArgs };
