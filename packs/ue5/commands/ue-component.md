Create a new Unreal Engine ActorComponent: $ARGS

1. Read the `.uproject` for the engine version and module name; follow the module's existing folder layout.
2. Fetch the templates with the `pack` tool — `pack ue5/template/ActorComponent.h.tmpl` and
   `pack ue5/template/ActorComponent.cpp.tmpl`; `read_file` cannot reach a pack's own files.
   Fill in `{{MODULE_API}}` and `{{NAME}}` (class name without the `U` prefix).
3. Use `USceneComponent` as the base instead only if the component needs a transform.
4. Implement what the request asks for. Expose to Blueprints with `BlueprintCallable` / `BlueprintReadWrite` and a `Category` where it makes sense.
5. Build, fix the first error, rebuild until it passes.
6. Tell the user how to add it (to a Blueprint, or via `CreateDefaultSubobject` in a C++ actor's constructor).
