#!/usr/bin/env node
const { parseArgs } = require("./lib/args");
const { dispatch } = require("./lib/commands");

function main(argv) {
  const result = dispatch(parseArgs(argv));
  result.out.forEach((line) => process.stdout.write(line + "\n"));
  result.err.forEach((line) => process.stderr.write(line + "\n"));
  return result.code;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = { main };
