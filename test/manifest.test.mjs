import { test, assert } from "./run.mjs";
import { readFileSync, statSync } from "node:fs";

const root = new URL("../packs/ui-web/", import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(root + "pack.json", "utf8"));

test("core is within its declared budget", () => {
  const bytes = statSync(root + "core.md").size;
  const estimate = Math.floor(bytes / 3); // the deterministic estimate
  assert(
    estimate <= manifest.core.budget_tokens,
    `core ~${estimate} tokens over ${manifest.core.budget_tokens}`
  );
});

test("every verify command is an argument vector naming a known parser", () => {
  const parsers = ["generic", "gcc", "msvc", "ubt"];
  for (const c of manifest.verify) {
    assert(Array.isArray(c.cmd) && c.cmd.length > 0, `${c.name}: cmd is not an argv`);
    assert(parsers.includes(c.parser), `${c.name}: unknown parser ${c.parser}`);
  }
});

// A whole-branch review found `npx tsc` in this manifest. npx does not resolve
// to TypeScript: in a project without a local one it fetches and runs
// tsc@2.0.4, an unmaintained squatter package, from the network — in an
// offline-first harness, on every verify run, and with output no parser can
// read. No check may reach for the network to find its own toolchain.
test("no verify command invokes a package runner", () => {
  for (const c of manifest.verify) {
    for (const arg of c.cmd) {
      assert(!/^(npx|pnpm|yarn|bunx|dlx)$/.test(arg), `${c.name}: cmd invokes ${arg}`);
    }
  }
});

// Every wrapper is run through `node` explicitly rather than by its shebang,
// because node_modules/.bin holds a shell script on Unix and a .cmd shim on
// Windows and spawn can execute neither there. The same reasoning applies to
// our own tools: `node tools/lint` works on every platform, `./tools/lint`
// does not.
test("every pack wrapper a verify command names exists and is run through node", () => {
  for (const c of manifest.verify) {
    const i = c.cmd.findIndex((a) => a.startsWith("{pack}/tools/"));
    if (i === -1) continue;
    assert(c.cmd[i - 1] === "node", `${c.name}: ${c.cmd[i]} is not run through node`);
    const rel = c.cmd[i].replace("{pack}/", "");
    assert(statSync(root + rel).isFile(), `${c.name}: ${rel} does not exist`);
    // 0o111: executable for somebody. The bit is still what a person running
    // the wrapper by hand relies on, and git tracks it.
    assert((statSync(root + rel).mode & 0o111) !== 0, `${rel} is not executable`);
  }
});

test("every chunk file exists and is under the 4 KiB floor", () => {
  for (const [name, chunk] of Object.entries(manifest.chunks ?? {})) {
    const bytes = statSync(root + chunk.file).size;
    assert(bytes < 4096, `chunk ${name} is ${bytes} bytes`);
    assert(chunk.summary && chunk.summary.length > 0, `chunk ${name} has no summary`);
  }
});

// core.md tells the model to "fetch the chunk named in a playbook entry". That
// promise is only true if every entry names one and every name resolves, so it
// is a test rather than a convention.
test("every playbook entry names a chunk that exists", () => {
  const playbook = readFileSync(root + "playbooks/errors.md", "utf8");
  const known = new Set(Object.keys(manifest.chunks ?? {}));
  assert(known.size > 0, "no chunks registered");

  // A reference is a backticked token that is exactly `ui-web/<name>`, which is
  // what distinguishes it from a path like `fixtures/ui-web/captured/`.
  const REF = /`ui-web\/([a-z0-9-]+)`/g;
  for (const [, chunk] of playbook.matchAll(REF)) {
    assert(known.has(chunk), `playbook points at ui-web/${chunk}, which is not in the manifest`);
  }

  // Entry bodies start at the "## " heading; the file's own header is not one.
  const bodies = playbook.split(/^## /m).slice(1);
  for (const body of bodies) {
    const title = body.split("\n", 1)[0];
    assert(new RegExp(REF.source).test(body), `entry "${title}" names no chunk`);
  }
});

test("detection requires both a package manifest and a tsx file", () => {
  assert(manifest.detect.all.includes("package.json"), "missing package.json");
  assert(
    manifest.detect.all.some((g) => g.endsWith("*.tsx")),
    "missing a tsx glob"
  );
});
