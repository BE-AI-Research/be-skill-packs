Diagnose and fix the current Unreal build failure. $ARGS

1. Run the project's verification (the pack's build) and read the FIRST error only.
2. The verification already names the single root cause, and where the harness has the
   playbook it attaches the matching entry to that failure. If it has not, fetch the chunk
   covering the error: `pack ue5/cpp-reflection` for reflection, UHT and object-lifetime
   errors, `pack ue5/build-system` for module, linker and plugin errors.
3. Apply the fix. Change only what that one error requires.
4. Rebuild. If the same error returns, do something different from the previous change —
   where a playbook entry is attached, its `next` step says what.
5. If the error is a Live Coding lock, stop and ask the user to close the editor.
6. Summarise: the error, the cause, the change made, and the build result.
