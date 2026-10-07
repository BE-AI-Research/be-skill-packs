Create a new Unreal Engine Actor class: $ARGS

1. Read the `.uproject` to find the engine version and the primary module name.
2. Find where this module keeps headers and sources (`Public/` + `Private/`, or the module root) and follow the same layout.
3. Fetch the templates with the `pack` tool — `pack ue5/template/Actor.h.tmpl` and
   `pack ue5/template/Actor.cpp.tmpl`. A pack lives outside the workspace, so `read_file`
   cannot reach its files. Fill in:
   - `{{MODULE_API}}`: the module name upper-cased plus `_API`
   - `{{NAME}}`: the class name without the `A` prefix
   - `{{BASE}}` / `{{BASE_INCLUDE}}`: the base class (default `AActor`, `GameFramework/Actor.h`)
4. Add any components, properties, or functions the request asks for, following the core reflection rules.
5. If a new type from another module is used, add that module to the `.Build.cs`.
6. Build. Fix the first error, rebuild, until it passes.
7. Tell the user what to set up in the editor (placing the actor, creating a Blueprint subclass, assigning assets), since you cannot edit `.uasset` files.
