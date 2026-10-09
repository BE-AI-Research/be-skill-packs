let failures = 0;

// This runner executes each test as it is defined, which several test files
// rely on — a `const` declared between two tests is visible to the second and
// not the first, and the files are written that way on purpose.
//
// That makes an async test body a silent lie: `fn()` returns a pending promise,
// nothing waits for it, `ok` is printed, and any assertion inside it surfaces
// later as an unhandled rejection attributed to nothing. So a returned thenable
// is refused outright instead. Making the runner await would mean tests no
// longer run in definition order, which is a bigger change than any current
// test needs.
export function rejectThenable(name, result) {
  if (result !== null && typeof result === "object" && typeof result.then === "function") {
    throw new Error(
      `${name} returned a promise, but this runner is synchronous: nothing would wait for it and a failure inside it would be reported as an unhandled rejection. Do the async work before the test and assert on its result, or await it inside the body with a top-level await in the test file.`,
    );
  }
  return result;
}

export function test(name, fn) {
  try {
    rejectThenable(name, fn());
    console.log(`ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`FAIL ${name}\n     ${err.message}`);
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg ?? "assertion failed");
}

process.on("exit", () => {
  if (failures > 0) {
    console.log(`\n${failures} failure(s)`);
    process.exitCode = 1;
  }
});
