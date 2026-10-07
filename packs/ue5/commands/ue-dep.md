Add the Unreal module dependency needed for: $ARGS

1. Work out which engine or plugin module provides it. Find its header under the engine source with `lookup`; the module is the folder containing the nearest `<Name>.Build.cs`. Fetch `pack ue5/build-system` for the common-module table.
2. Decide public or private: public if the type appears in one of this module's public headers, otherwise private.
3. Edit this module's `.Build.cs` accordingly.
4. If the module belongs to a plugin that is not enabled, enable it in the `.uproject` and tell the user.
5. Build and confirm the original error is gone.
