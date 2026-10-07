You are working in an Unreal Engine 5 C++ project. These rules are not optional.

**Find the engine version first.** Read `EngineAssociation` in the `.uproject`. APIs change between 5.x releases; when unsure whether something exists in this version, say so and check engine headers with `lookup` rather than guessing.

**Reflection.**
- Every `UCLASS`, `USTRUCT` and `UINTERFACE` body starts with `GENERATED_BODY()`.
- `#include "ClassName.generated.h"` is the LAST include in its header, and its name matches the header's file name.
- Only reflected types (UCLASS/USTRUCT/UENUM) can appear in `UPROPERTY` or `UFUNCTION` signatures.
- After changing any header that has reflection macros, the build must rerun UHT; Live Coding cannot apply it.

**Object lifetime.**
- A member pointer to a `UObject` must be a `UPROPERTY()` (prefer `TObjectPtr<T>`), or garbage collection may destroy what it points to.
- Never `new` or `delete` a UObject. Use `CreateDefaultSubobject<T>()` (constructor only), `NewObject<T>()` (runtime), or `GetWorld()->SpawnActor<T>()` (actors).
- Non-UObject data: plain members, `TUniquePtr`, `TSharedPtr`. Weak references to UObjects: `TWeakObjectPtr`.

**Naming.** `A` Actor, `U` UObject/component, `F` struct or plain class, `E` enum, `I` interface, `T` template, `b` prefix on bools. UHT enforces the class prefixes.

**Types.** `int32`/`uint8` not `int`/`char` in reflected members. `FString` text, `FName` identifiers, `FText` user-facing. `TArray`/`TMap`/`TSet`, not STL. Log with `UE_LOG(LogCategory, Level, TEXT("..."))`.

**Modules.** Using a type from another module means adding that module to this module's `.Build.cs` (`PublicDependencyModuleNames` if it appears in your public headers, otherwise `PrivateDependencyModuleNames`). An unresolved external is almost always this. Classes used from another module need `MODULENAME_API`.

**Files you must not edit.** `.uasset` and `.umap` are binary: never write them as text. Blueprint and asset changes need the editor (or the `ue-editor` tools if available); if you cannot do it, say exactly what the user must change in the editor. Never edit `Intermediate/`, `Binaries/`, `Saved/` or `DerivedDataCache/`; they are generated.

**Networking.** Replicated properties need `UPROPERTY(Replicated)` or `ReplicatedUsing=OnRep_X`, an override of `GetLifetimeReplicatedProps` that calls `Super` and uses `DOREPLIFETIME`, `#include "Net/UnrealNetwork.h"`, and `bReplicates = true`. RPCs are implemented as `Name_Implementation`. Gate authority-only logic with `HasAuthority()`.

**Verification.** The build is the test. Fix the first error only, then rebuild. If the build says Live Coding is active, stop and ask the user to close the editor; do not try to work around it.
