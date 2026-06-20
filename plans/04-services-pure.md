# Phase 4 — Services A (Pure Logic)

## Goal
Port the 4 stateless / pure-logic services that have **no repository dependencies** (or only trivial ones). These are the building blocks used by the heavier services in Phase 5.

## Services in This Phase

| TS File (~lines) | C# File | Interface |
|---|---|---|
| `deck.service.ts` (75) | `DeckService.cs` | `IDeckService` |
| `card-effect.service.ts` (95) | `CardEffectService.cs` | `ICardEffectService` |
| `companion-ability.service.ts` (130) | `CompanionAbilityService.cs` | `ICompanionAbilityService` |
| `leveling.service.ts` (105) | `LevelingService.cs` | `ILevelingService` |

**Total TS to paste: ~405 lines.**

## Prompt Template
> Paste the 4 TS service files plus the C# model type names list, then:

```
Convert these 4 TypeScript services to C# in namespace TheGameIsOn.API.Services.

Rules:
- Each service gets an interface + class in one file.
- All methods that accept/return GameState must return a NEW GameState
  (no in-place mutation). Use `record` "with" expressions or manual
  copy where the model is a class.
- Replace TS spread { ...obj, field: newVal } with record "with" or
  manual shallow-copy helpers.
- Fisher-Yates shuffle: use Random.Shared (thread-safe in .NET 8).
- Math.random() → Random.Shared.NextDouble().
- Math.floor() → (int)Math.Floor() or integer division.
- Keep XML-doc comments matching the TS JSDoc.
- No file I/O — these are pure logic.
```

## Per-Service Notes

### `DeckService`
- Generic `Shuffle<T>` is fine.
- `DrawCards` loops up to `count`, reshuffling discard into deck when empty — straightforward port.
- `BuildStartingDeck` accepts `List<Card>` baseCards + `List<Companion>` companions, returns `(Deck deck, List<Card> cards)` tuple.

### `CardEffectService`
- `EffectSource` and `EffectTarget` are **union types** in TS (`Companion | BattleEnemy`). In C# use a common interface or just `object` and pattern-match:
  ```csharp
  public interface IEffectEntity { string Id { get; } }
  ```
  Make both `Companion` and `BattleEnemy` implement it in Phase 2's models (add a note to go back and add the interface if not already done).
  
  **Alternative (simpler):** accept `object source, List<object> targets` and use `is Companion c` / `is BattleEnemy e` pattern matching — mirrors the TS `'priceDecks' in source` duck-typing.

- `applyDamage`: shield-then-life arithmetic. Watch for `(companion as any).shield` — this means `Companion` needs a `Shield` property (int, defaults to 0). **Add it to the model in this phase if missing.**

### `CompanionAbilityService`
- `applyPassiveModifiers`, `getPostPlayEffects`, `getCostReduction`, `getRetaliationDamage` — all iterate `companion.SpecialAbilities` filtering by trigger + modifier type.
- `checkCondition` uses a mini expression evaluator over `field` / `op` / `value`. Port with a switch on field, then a switch on op.

### `LevelingService`
- `expThreshold(level)` → `level * 100`.
- `processLevelUps` loops while `exp >= threshold`, incrementing level and applying stat boosts.
- `processAll` maps over a list of companions.
- `pickRandom<T>` — Fisher-Yates sample of up to N elements.
- Returns `PendingAbilityChoice[]` alongside leveled companions — use a tuple or a small result record.

## Model Patches Required
If not already done in Phase 2, ensure:
1. `Companion` has a `int Shield` property (default 0) — used by `CardEffectService.applyDamage`.
2. `Companion` and `BattleEnemy` share a common interface `IEffectEntity` with at least `string Id` and `int Life`.

## Validation
```powershell
dotnet build
```
All 4 services + interfaces compile. No runtime test yet.
