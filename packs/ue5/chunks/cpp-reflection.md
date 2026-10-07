# UE5 C++ reflection, UHT, and object lifetime

## How it works

Unreal Header Tool (UHT) reads your headers before the C++ compiler runs. For
every type marked `UCLASS`, `USTRUCT`, `UENUM`, or `UINTERFACE` it generates
code into `ClassName.generated.h` and a matching `.gen.cpp`. That generated
code is what gives the editor, Blueprints, serialization, replication, and the
garbage collector their knowledge of your types. If UHT fails, nothing compiles.

## Minimal correct header

```cpp
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Pickup.generated.h"          // always last, name matches this file

class USphereComponent;                 // forward declare in headers

UCLASS()
class SHOOTER_API APickup : public AActor   // SHOOTER_API = module name + _API
{
    GENERATED_BODY()                    // first thing in the body

public:
    APickup();

protected:
    virtual void BeginPlay() override;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Pickup")
    TObjectPtr<USphereComponent> Collision;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Pickup", meta = (ClampMin = "0"))
    int32 Amount = 10;

    UFUNCTION(BlueprintCallable, Category = "Pickup")
    void Collect(AActor* Collector);
};
```

```cpp
#include "Pickup.h"
#include "Components/SphereComponent.h"  // full include in the .cpp

APickup::APickup()
{
    PrimaryActorTick.bCanEverTick = false;
    Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
    RootComponent = Collision;
}
```

## UPROPERTY specifiers you will need

| Specifier | Meaning |
|---|---|
| `EditAnywhere` | Editable on archetypes (class defaults) and instances |
| `EditDefaultsOnly` | Editable on class defaults only |
| `EditInstanceOnly` | Editable on placed instances only |
| `VisibleAnywhere` | Shown, read-only. Use for component pointers |
| `BlueprintReadOnly` / `BlueprintReadWrite` | Blueprint access. Needs a `Category` |
| `Replicated` / `ReplicatedUsing = OnRep_Name` | Network replication (see core rules) |
| `Transient` | Not saved |
| `SaveGame` | Included when serializing for save games |
| `meta = (...)` | Editor hints: `ClampMin`, `ClampMax`, `AllowPrivateAccess = "true"`, `EditCondition = "bFlag"` |

`Edit*` and `Visible*` are mutually exclusive. `BlueprintReadWrite` on a
private member needs `meta = (AllowPrivateAccess = "true")`.

## UFUNCTION specifiers

| Specifier | Meaning | What you must write |
|---|---|---|
| `BlueprintCallable` | Callable from Blueprints | Normal definition |
| `BlueprintPure` | Callable, no exec pins. Should not change state | Normal definition, usually `const` |
| `BlueprintImplementableEvent` | Implemented in Blueprint only | **No** C++ definition at all |
| `BlueprintNativeEvent` | C++ default, Blueprint may override | Define `Name_Implementation`, declare it `virtual ... _Implementation(...)` if overriding in subclasses. Call it as `Name(...)` |
| `Server` / `Client` / `NetMulticast` | RPC | Must also be `Reliable` or `Unreliable`. Define `Name_Implementation` |
| `WithValidation` | RPC validation | Also define `bool Name_Validate(...)` |
| `Exec` | Console command | Only works on certain classes (PlayerController, Pawn, HUD, GameMode, CheatManager) |

A function that calls the base class's `BlueprintNativeEvent` from an override
calls `Super::Name_Implementation(...)`, not `Super::Name(...)`.

## Structs and enums

```cpp
USTRUCT(BlueprintType)
struct FWeaponStats
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite)
    float Damage = 10.f;
};

UENUM(BlueprintType)
enum class EWeaponState : uint8
{
    Idle,
    Firing,
    Reloading
};
```

Blueprint-exposed enums must be `uint8`. `USTRUCT`s are value types: they are
not garbage-collected objects and are never created with `NewObject`. A
`USTRUCT` member that points at a UObject still needs `UPROPERTY()` for GC to
see it, and only does so when the struct itself is reachable through a
`UPROPERTY`.

## Garbage collection rules

The GC keeps a UObject alive only if it is reachable from the root set through
**reflected** references. Concretely:

- `UPROPERTY() TObjectPtr<UFoo> Foo;` is a strong reference. Safe.
- `UFoo* Foo;` with no `UPROPERTY` is invisible to GC. The object can be
  destroyed while you still hold the pointer. This is the classic crash.
- `TArray<TObjectPtr<UFoo>>` and `TMap` values need `UPROPERTY()` too.
- `TWeakObjectPtr<UFoo>` does not keep the object alive; check `IsValid()`
  before use.
- Plain C++ classes that must hold UObjects either derive from
  `FGCObject` and implement `AddReferencedObjects`, or hold `TStrongObjectPtr`.
- Actors are destroyed by `Destroy()`, not by losing references. After
  destruction, check pointers with `IsValid(Ptr)`, not `Ptr != nullptr`.

`TObjectPtr<T>` is the UE5 convention for UObject member properties. Raw
pointers remain fine for function parameters and locals.

## Creating objects

| Situation | Use |
|---|---|
| Components owned by an actor, set up once | `CreateDefaultSubobject<T>(TEXT("Name"))` **in the constructor only** |
| Components added at runtime | `NewObject<T>(this)`, then `RegisterComponent()` (and attach if a scene component) |
| Any other UObject at runtime | `NewObject<T>(Outer)` |
| Actors | `GetWorld()->SpawnActor<T>(Class, Transform, SpawnParams)` |
| Data assets / defaults | Load through `TSoftObjectPtr` / `TSoftClassPtr` and the asset manager, or reference by `UPROPERTY` |

Constructors run for the Class Default Object (CDO) when the module loads.
Do not touch the world, spawn actors, or read other actors in a constructor.
Use `BeginPlay`, `PostInitializeComponents`, or `OnConstruction` instead.

## Interfaces

```cpp
UINTERFACE(MinimalAPI, Blueprintable)
class UInteractable : public UInterface { GENERATED_BODY() };

class SHOOTER_API IInteractable
{
    GENERATED_BODY()
public:
    UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "Interact")
    void Interact(AActor* Instigator);
};
```

Call through the interface with `IInteractable::Execute_Interact(Target, Instigator)`
so Blueprint implementations work. Check with
`Target->Implements<UInteractable>()`, not a `Cast` to the `I` type, when the
implementer may be a Blueprint.

## Delegates

```cpp
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnHealthChanged, float, NewHealth);

UPROPERTY(BlueprintAssignable, Category = "Health")
FOnHealthChanged OnHealthChanged;
```

Dynamic delegates are reflected and Blueprint-bindable; the parameter names in
the macro are required. Functions bound with `AddDynamic` must be `UFUNCTION()`.
Non-dynamic delegates (`DECLARE_MULTICAST_DELEGATE`) are faster and C++ only.

## Common mistakes to check before building

1. `.generated.h` not the last include, or its name does not match the file.
2. `GENERATED_BODY()` missing or not first in the class body.
3. A UObject member pointer without `UPROPERTY()`.
4. `CreateDefaultSubobject` called outside the constructor.
5. `BlueprintNativeEvent` or RPC defined as `Name` instead of `Name_Implementation`.
6. `BlueprintImplementableEvent` given a C++ body.
7. Non-reflected type (`std::string`, a plain C++ class) in a `UPROPERTY` or `UFUNCTION` signature, or `int` where Blueprints need `int32`.
8. Missing module API macro on a class used from another module.
