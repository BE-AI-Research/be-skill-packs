# UE5 error playbook

Format: one `##` entry per failure. `match` is a Go regular expression tried
against the diagnostic's raw line and message; the first matching entry in
file order wins, so specific entries come before general ones. `fix` is shown
on the first failure, `next` when the same failure signature comes back.

## Live Coding lock
match: Unable to build while Live Coding is active
kind: tool
cause: The editor is open with Live Coding enabled, and UBT will not build the same target underneath it.
fix:
1. Stop. Do not edit files to work around this.
2. Tell the user to close the Unreal Editor (or press Ctrl+Alt+F11 in the editor to compile through Live Coding), then rerun the build.
next: Still blocked means an editor or game process is still running. Ask the user to check for leftover UnrealEditor processes.

## .generated.h is not the last include
match: \.generated\.h file should always be the last #include|found after \.generated\.h
kind: uht
cause: UHT requires the generated header to be the final include in a reflected header.
fix:
1. Open the header named in the error.
2. Move `#include "Name.generated.h"` so it is the last `#include` line. Move any include after it above it.
next: If it is already last, check for an include hidden in a macro or a second `.generated.h` include, and that the generated header's name matches the file name exactly.

## Missing GENERATED_BODY
match: Expected a GENERATED_BODY|GENERATED_BODY\(\) at the start of
kind: uht
cause: A UCLASS/USTRUCT/UINTERFACE body does not begin with GENERATED_BODY().
fix:
1. Add `GENERATED_BODY()` as the first line inside the type's braces.
2. Remove any old `GENERATED_UCLASS_BODY()` / `GENERATED_USTRUCT_BODY()` in the same type.
next: Make sure the macro is not inside an `#if` block and the type has exactly one reflection macro above it.

## Unrecognized type in a reflected signature
match: Unrecognized type|Unable to find 'class', 'delegate', 'enum', or 'struct'|type must be a UCLASS, USTRUCT, UENUM
kind: uht
cause: A UPROPERTY or UFUNCTION uses a type UHT does not know: a plain C++ type, a misspelled type, or a reflected type whose header was never included.
fix:
1. If the type is your own, make sure it is a USTRUCT/UCLASS/UENUM with GENERATED_BODY().
2. If it is reflected, include its header (or forward-declare it, for pointers) in this header.
3. If it is a plain C++ type, remove the UPROPERTY/UFUNCTION exposure or wrap the data in a USTRUCT.
next: Fetch `pack ue5/cpp-reflection` and check the type against the "Structs and enums" section.

## Generated header not found
match: (\.generated\.h).*(No such file|file not found|cannot open)|cannot open include file.*\.generated\.h
kind: compile
cause: UHT did not generate this header. Usually the header has no reflection macro, its file name does not match the include, or it is outside the module's source folder.
fix:
1. Check the include matches the header's own file name exactly, including case.
2. Make sure the header contains a UCLASS/USTRUCT/UENUM/UINTERFACE.
3. Make sure the file is under `Source/<Module>/` of a module listed in the `.uproject`.
next: Delete the project's `Intermediate/` folder and rebuild so UHT regenerates everything.

## Missing _Implementation for a native event or RPC
match: (_Implementation|_Validate).*(unresolved external|undefined reference|undefined symbol)|(unresolved external|undefined reference|undefined symbol).*(_Implementation|_Validate)
kind: link
cause: A BlueprintNativeEvent or RPC was declared but its `_Implementation` (or `_Validate` with WithValidation) body was not defined.
fix:
1. In the .cpp, define `ReturnType AClass::Name_Implementation(Params)`; do not define `Name` itself.
2. If the UFUNCTION has `WithValidation`, also define `bool AClass::Name_Validate(Params)`.
next: Check the parameter list of `_Implementation` exactly matches the UFUNCTION declaration, including const and references.

## GetLifetimeReplicatedProps missing
match: GetLifetimeReplicatedProps.*(unresolved|undefined)|(unresolved|undefined).*GetLifetimeReplicatedProps
kind: link
cause: The class declares replicated properties (UHT adds the declaration) but no definition exists.
fix:
1. Add `#include "Net/UnrealNetwork.h"` to the .cpp.
2. Define `void AClass::GetLifetimeReplicatedProps(TArray<FLifetimeProperty>& OutLifetimeProps) const`, call `Super::GetLifetimeReplicatedProps(OutLifetimeProps);`, then `DOREPLIFETIME(AClass, Prop);` for each replicated property.
next: Make sure the override's signature is exactly as above, including `const`.

## Unresolved external from another module
match: LNK2019|LNK2001|undefined reference to|undefined symbol
kind: link
cause: The symbol is defined in a module this module does not depend on, or in a class not exported with its module's API macro, or declared but never defined.
fix:
1. Identify the class or function in the error and find which module defines it (`lookup` the class name in the engine or project source; the module is the folder holding the nearest `.Build.cs`).
2. Add that module to `PublicDependencyModuleNames` or `PrivateDependencyModuleNames` in this module's `.Build.cs`.
3. If it is a plugin module, make sure the plugin is enabled in the `.uproject`.
next: If the dependency is already present, the symbol may be missing its `MODULE_API` macro (your own classes) or have no definition in any .cpp. Fetch `pack ue5/build-system`.

## Undeclared identifier
match: C2065|undeclared identifier|was not declared in this scope|use of undeclared identifier
kind: compile
cause: A name is used that the compiler cannot see: a typo, a missing include, or a member used outside its class.
fix:
1. Check the spelling against the declaration (`lookup` the name).
2. If it is declared in another header, include that header in this .cpp.
next: If it is an engine type, find its header under the engine source and include it by its module-relative path; check the module is in `.Build.cs`.

## Incomplete type
match: C2027|incomplete type|use of undefined type|invalid use of incomplete type|member access into incomplete type
kind: compile
cause: The type is only forward-declared here, but its members are being used.
fix:
1. Add the full `#include` for the type in the .cpp that uses its members. Keep the forward declaration in the header.
next: If this is in a header, decide whether the header really needs the full type; if so include it there, otherwise move the code into the .cpp.

## Not a member
match: C2039|is not a member of|no member named
kind: compile
cause: The member does not exist on that type: a typo, the wrong class, an API that changed between engine versions, or a missing include so a different overload is seen.
fix:
1. `lookup` the member name to find where it is really declared.
2. If it is an engine API, check it exists in this engine version (see `EngineAssociation`).
next: The API may have been renamed or deprecated in this version. Search the engine headers for the class and read its current members.

## Cannot instantiate abstract class
match: C2259|cannot instantiate abstract class|allocating an object of abstract class type
kind: compile
cause: A pure virtual function from a base class or interface is not overridden.
fix:
1. Find the pure virtual functions named in the error's notes.
2. Override each in this class with the exact signature and `override`.
next: For UINTERFACE native events, implement `Name_Implementation`, not `Name`.

## Module definition not found
match: Could not find definition for module
kind: tool
cause: A module named in the `.uproject`, a `.uplugin`, or a `.Build.cs` dependency list has no matching `<Name>.Build.cs`.
fix:
1. Check the module name for typos in `.Build.cs` dependency lists.
2. Check every module in the `.uproject` `Modules` array has `Source/<Name>/<Name>.Build.cs`, with the class name equal to the file name.
next: If the module belongs to a plugin, the plugin may not be installed or enabled.

## Plugin not found
match: Unable to find plugin
kind: tool
cause: The `.uproject` enables a plugin that is not installed for this engine or project.
fix:
1. Tell the user which plugin is missing. Do not delete it from the `.uproject` unless they say so; content may depend on it.
next: If the user confirms it is unused, set `"Enabled": false` for it in the `.uproject`.

## Unknown failure
match: .
kind: any
cause: No specific entry matched.
fix:
1. Read the first error line carefully, fix that one thing only, rebuild.
next: Fetch the most relevant chunk with the `pack` tool before trying again; do not repeat the previous change.
