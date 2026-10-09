// The runner's own guard. An async test body used to print `ok` before doing
// anything, so a broken assertion inside one would have been reported as an
// unhandled rejection belonging to no test at all.

import { test, assert, rejectThenable } from "./run.mjs";

test("a synchronous test body's return value passes through", () => {
  assert(rejectThenable("t", undefined) === undefined);
  assert(rejectThenable("t", 42) === 42);
  assert(rejectThenable("t", null) === null);
  // An object that merely has a `then` property, not a callable one, is not a
  // thenable and must not be mistaken for one.
  const notThenable = { then: "tomorrow" };
  assert(rejectThenable("t", notThenable) === notThenable);
});

test("an async test body is refused rather than silently passing", () => {
  let threw = null;
  try {
    rejectThenable("some async test", Promise.resolve("done"));
  } catch (err) {
    threw = err;
  }
  assert(threw !== null, "a returned promise must be refused");
  assert(/synchronous/.test(threw.message), threw.message);
  assert(/some async test/.test(threw.message), threw.message);
});
