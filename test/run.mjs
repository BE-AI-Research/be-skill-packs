let failures = 0;

export function test(name, fn) {
  try {
    fn();
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
