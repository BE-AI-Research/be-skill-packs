// Runs the scan the way the harness runs it: node, the script's path, no
// shell. Returns the output and exit code rather than throwing, because the
// exit code is part of what the tests assert.
//
// This lives in its own file rather than in scan-git.test.mjs on purpose:
// importing a test file runs its tests, so exporting the helper from there
// would make every later test file re-run and re-report them.
import { execFileSync } from "node:child_process";

const SCAN = new URL("../packs/assist/tools/scan", import.meta.url).pathname;

export function scan(dir, extra = []) {
  try {
    return {
      out: execFileSync("node", [SCAN, "--project", dir, ...extra], { encoding: "utf8" }),
      code: 0,
    };
  } catch (err) {
    return { out: (err.stdout ?? "") + (err.stderr ?? ""), code: err.status ?? 1 };
  }
}

// The line a section printed, or "" — every scan test asks this question.
export function line(out, prefix) {
  return out.split("\n").find((l) => l.startsWith(prefix)) ?? "";
}
