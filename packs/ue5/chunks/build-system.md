# UE5 build system: projects, modules, plugins, building

## The pieces

| File | Role |
|---|---|
| `Project.uproject` | JSON. Engine version, list of the project's modules, enabled plugins |
| `Source/Project.Target.cs` | Game target rules (C#) |
| `Source/ProjectEditor.Target.cs` | Editor target rules |
| `Source/<Module>/<Module>.Build.cs` | One per module: dependencies and compile settings |
| `Plugins/<Plugin>/<Plugin>.uplugin` | JSON. A plugin and its modules |

UnrealBuildTool (UBT) reads these C# rules, runs UHT, then drives the
compiler and linker. The rules files are compiled by UBT itself, so a C#
error in them fails the build before any C++ is touched.

## `.uproject`

```json
{
  "FileVersion": 3,
  "EngineAssociation": "5.4",
  "Modules": [
    { "Name": "Shooter", "Type": "Runtime", "LoadingPhase": "Default" }
  ],
  "Plugins": [
    { "Name": "GameplayAbilities", "Enabled": true }
  ]
}
```

`EngineAssociation` is a version like `"5.4"` for an installed binary engine,
or a GUID / empty for a source build registered on this machine. Every module
listed in `Modules` must have a matching `Source/<Name>/<Name>.Build.cs`.
`Type` is usually `Runtime`; editor-only modules use `Editor` and must not be
depended on by runtime modules.

## `.Build.cs`

```csharp
using UnrealBuildTool;

public class Shooter : ModuleRules
{
    public Shooter(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core", "CoreUObject", "Engine", "InputCore", "EnhancedInput"
        });

        PrivateDependencyModuleNames.AddRange(new string[] { });
    }
}
```

The class name must equal the module name and the file name.

**Public vs private dependencies.** If a type from module X appears in one of
your *public headers* (the `Public/` folder, or any header another module
includes), X goes in `PublicDependencyModuleNames`. If it is only used in
`.cpp` files or private headers, use `PrivateDependencyModuleNames`. When in
doubt, public works but slows builds.

**Editor-only code** in a runtime module: wrap it in `#if WITH_EDITOR` and add
editor modules conditionally:

```csharp
if (Target.bBuildEditor)
{
    PrivateDependencyModuleNames.Add("UnrealEd");
}
```

## Which module do I need?

Find the header's path under `Engine/Source/` or `Engine/Plugins/`; the module
is the folder that contains a `<Name>.Build.cs`. Common ones:

| You use | Add module | Also enable plugin in `.uproject` |
|---|---|---|
| `UEnhancedInputComponent`, `UInputAction`, `UInputMappingContext` | `EnhancedInput` | `EnhancedInput` (on by default in recent 5.x) |
| `UGameplayAbility`, `UAbilitySystemComponent`, `UAttributeSet` | `GameplayAbilities`, `GameplayTags`, `GameplayTasks` | `GameplayAbilities` |
| `FGameplayTag`, `FGameplayTagContainer` | `GameplayTags` | |
| `UUserWidget`, UMG widgets | `UMG`, often `Slate`, `SlateCore` | |
| `UNiagaraComponent`, `UNiagaraSystem` | `Niagara` | `Niagara` (on by default) |
| `AAIController`, behavior trees, blackboard | `AIModule` (behavior trees may also need `GameplayTasks`) | |
| `UNavigationSystemV1`, nav queries | `NavigationSystem` | |
| `FHttpModule` | `HTTP` | |
| `FJsonObject`, `FJsonObjectConverter` | `Json`, `JsonUtilities` | |
| `UKismetSystemLibrary`, `UGameplayStatics` | `Engine` (already there) | |

If a header is found but linking fails, the module is missing from
`.Build.cs`. If the header is not found at all, either the module is missing
or the include path is wrong. Includes are relative to a module's `Public/`
or `Classes/` folder, e.g. `#include "Components/SphereComponent.h"`.

## Module API macros

Each module gets a macro `<MODULENAME>_API` (module name upper-cased). Put it
on any class or free function that other modules call:

```cpp
class SHOOTER_API AShooterCharacter : public ACharacter
```

Without it, the symbol is not exported from the module's DLL/shared library
and other modules get unresolved externals. Within a single module it is not
needed but is harmless and conventional.

## Folder convention

```
Source/Shooter/
├── Shooter.Build.cs
├── Public/        headers other modules may include
└── Private/       .cpp files and internal headers
```

Small single-module projects often put everything at the module root; UBT
accepts both. Follow whatever the project already does.

## Plugins

A code plugin lives at `Plugins/<Name>/` with `<Name>.uplugin` and its own
`Source/<Module>/<Module>.Build.cs` per module. A project module that uses a
plugin's module adds it to `.Build.cs` like any other module **and** the plugin
must be enabled (in the `.uproject`, or `"EnabledByDefault": true` in the
`.uplugin`).

## Building

The editor target is named `<Project>Editor`; build it in `Development` for
day-to-day work.

```sh
# Linux
"$UE_ROOT/Engine/Build/BatchFiles/Linux/Build.sh" ShooterEditor Linux Development -Project="/path/Shooter.uproject" -WaitMutex
# macOS
"$UE_ROOT/Engine/Build/BatchFiles/Mac/Build.sh" ShooterEditor Mac Development -Project="/path/Shooter.uproject" -WaitMutex
```
```bat
:: Windows
"%UE_ROOT%\Engine\Build\BatchFiles\Build.bat" ShooterEditor Win64 Development -Project="C:\path\Shooter.uproject" -WaitMutex
```

The pack's `ue-build` tool wraps these and is what verification runs.

Regenerate IDE project files after adding or removing source files or
modules, if the user works in an IDE: right-click the `.uproject` →
Generate Project Files, or run `GenerateProjectFiles` from
`Engine/Build/BatchFiles/` with `-project=<path>`. UBT itself does not need
project files to build.

## Live Coding and when a rebuild is required

Live Coding patches function bodies into a running editor. It **cannot**
reliably apply: new or removed `UPROPERTY`/`UFUNCTION`, new reflected types,
changed class layout, constructor changes that affect defaults, or
`.Build.cs` / `.uproject` changes. Those need the editor closed and a full
build.

While Live Coding is enabled in a running editor, an external UBT build of
that target refuses to run ("Unable to build while Live Coding is active").
The fix is for the user to close the editor (or press Ctrl+Alt+F11 to trigger
a Live Coding compile instead). Never try to bypass the lock.

## Clean build

When generated code is stale or UHT output looks wrong, delete the project's
`Binaries/` and `Intermediate/` folders (and each plugin's) and build again.
Never delete anything under the engine directory, and never delete
`Content/`, `Config/`, or `Saved/` as part of a clean.
