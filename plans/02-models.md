# Phase 2 — Models

## Goal
Port all 12 TypeScript model files to C# record / class types in `Models/`. Zero logic — pure data shapes.

## Prompt Template
> Paste **only** the 12 TS model files (concatenated, ~280 lines) into the prompt, plus this instruction:

```
Convert every TypeScript interface and type alias below into C# records or classes
in the namespace TheGameIsOn.API.Models.

Rules:
- Use records for simple DTOs; classes where mutability is needed.
- Use System.Text.Json attributes only if the C# name differs from the JSON key.
- Map TS union string types to C# enums with [JsonConverter(typeof(JsonStringEnumConverter))].
- Map `Record<string, unknown>` to `Dictionary<string, JsonElement>?`.
- Nullable fields (`?` in TS) become nullable in C# (`Type?`).
- One file per logical group (matching the TS file names).
- Add `// ReSharper disable InconsistentNaming` only if unavoidable.
```

## File-by-File Mapping

| TS File | C# File | Types Inside |
|---|---|---|
| `card.ts` | `Card.cs` | `CardTarget` (enum), `CardTargetNumber` (enum/struct), `CardElement` (enum), `CardEffectRef` (record), `Card` (record) |
| `deck.ts` | `Deck.cs` | `Deck` (record) |
| `player.ts` | `Player.cs` | `Player` (record) |
| `companion.ts` | `Companion.cs` | `SpecialAbilityTrigger` (enum), `PassiveModifierType` (enum), `PassiveCondition` (record), `PassiveModifier` (record), `SpecialAbility` (record), `CompanionPriceDecks` (record), `Companion` (class — mutated by leveling) |
| `enemy.ts` | `Enemy.cs` | `EnemyAttack` (record), `EnemyReward` (record), `EnemyDefinition` (record) |
| `battle-state.ts` | `BattleState.cs` | `StatusTriggerMoment` (enum), `StatusEffect` (record), `EnemyTurnAction` (record), `PendingCardReward` (record), `BattleEnemy` (class), `BattleState` (class) |
| `card-effect.ts` | `CardEffect.cs` | `CardEffectAction` (enum), `CardEffectTarget` (enum), `CardEffect` (record) |
| `node-event.ts` | `NodeEvent.cs` | `NodeEventType` (enum), `MapArea` (enum), `NodeEvent` (record) |
| `node.ts` | `Node.cs` | `NodeLayout` (record), `NodeDefinition` (record) |
| `graph.ts` | `Graph.cs` | `GraphEdge` (record), `Graph` (record) |
| `event-definition.ts` | `EventDefinition.cs` | `MonsterSpawnConfig` (record), `PoolFilter` (record), `EventSpawnRules` (record), `EventDefinition` (record) |
| `game-state.ts` | `GameState.cs` | `PendingAbilityChoice` (record), `GameState` (class) |

## Special Attention

### `CardTargetNumber` — TS: `1 | 2 | 'ALL'`
Use a custom JsonConverter or a wrapper struct:
```csharp
[JsonConverter(typeof(CardTargetNumberConverter))]
public readonly struct CardTargetNumber
{
    public int? NumericValue { get; init; }
    public bool IsAll { get; init; }
    // ...converter reads 1/2 as int, "ALL" as IsAll=true
}
```

### Enum serialisation
All enums must round-trip as **lowercase kebab-case strings** to match the JSON:
```csharp
[JsonConverter(typeof(JsonStringEnumConverter))]
public enum CardElement { Fire, Water, Earth, Air, Arcane, Shadow, Light, Neutral }
```
Use a custom naming policy or `[JsonPropertyName]` on each member if needed (e.g. `hard battle` has a space — use `[JsonStringEnumMemberName("hard battle")]` in .NET 9, or a custom converter in .NET 8).

### `NodeEventType` — has values with spaces (`"hard battle"`, `"new object"`, `"power up"`)
Since the JSON uses free-form strings, model this as `string` (not enum) or write a custom converter. The TS source already types it as `NodeEventType | string`, confirming it can be arbitrary.

## Validation
```powershell
dotnet build
```
All model files must compile with zero warnings. No logic, no constructors beyond what records auto-generate.
