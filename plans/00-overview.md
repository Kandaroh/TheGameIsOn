# Phase 0 — Migration Overview & Token Strategy

## Source Inventory (TypeScript / Express)

| Layer | Files | ~Lines | C# Target |
|---|---|---|---|
| **Entry + Server** | `index.ts`, `server.ts` | 25 | `Program.cs` |
| **Routes** | `game.routes.ts` | 22 | Attribute routing on controller |
| **Controller** | `game.controller.ts` | 185 | `GameController.cs` |
| **Models (12)** | `game-state`, `player`, `card`, `companion`, `deck`, `enemy`, `battle-state`, `card-effect`, `graph`, `node`, `node-event`, `event-definition` | 280 | Record / POCO classes in `Models/` |
| **Repos (6)** | `state-repo`, `base-card-repo`, `card-effect-repo`, `enemy-repo`, `event-repo`, `status-repo` | 260 | Repository classes in `Repositories/` |
| **Services (10)** | `battle`, `card-effect`, `companion-ability`, `companion`, `deck`, `enemy-spawner`, `event-spawner`, `game-logic`, `leveling`, `map-generator`, `persistence`, `status-effect` | 1050 | Service classes in `Services/` |
| **Test** | `spawn-test.ts` | 45 | xUnit test project |
| **Static data** | 6 JSON files in `data/static/` | — | Copied as-is to `data/static/` |
| **Save data** | `data/saves/game-state.json` | — | Copied as-is |

**Total backend source: ~1,870 lines of TypeScript.**

---

## Token Budget Strategy

### The Problem
Dumping 1,870 lines of TS + asking "rewrite in C#" would cost ~15K input + ~12K output per conversation. With corrections this balloons to 100K+ tokens.

### The Solution — Phased, Self-Contained Prompts
Each phase is designed so the **prompt includes only what's needed**:

| Phase | What the prompt must contain | Est. tokens (in+out) |
|---|---|---|
| **1 — Scaffold** | Only this overview doc | ~2K |
| **2 — Models** | Only the 12 TS model files (~280 lines) | ~4K |
| **3 — Repos** | Only the 6 TS repo files + C# model names from Phase 2 | ~5K |
| **4 — Services A** (pure logic) | `deck`, `card-effect`, `companion-ability`, `leveling` | ~6K |
| **5 — Services B** (stateful) | `battle`, `enemy-spawner`, `status-effect` | ~8K |
| **6 — Services C** (map/events) | `map-generator`, `event-spawner`, `companion`, `persistence`, `game-logic` | ~6K |
| **7 — Controller + Startup** | `game.controller.ts`, `server.ts`, `index.ts`, route list | ~5K |
| **8 — DI Wiring & Config** | Summary only — wire everything in `Program.cs` | ~2K |
| **9 — Test** | `spawn-test.ts` + xUnit conventions | ~2K |

**Estimated total: ~40K tokens** (vs. ~150K+ for a naive approach).

---

## Target C# Project Structure

```
backend-csharp/
├── TheGameIsOn.API/
│   ├── Program.cs
│   ├── TheGameIsOn.API.csproj
│   ├── appsettings.json
│   ├── Controllers/
│   │   └── GameController.cs
│   ├── Models/
│   │   ├── GameState.cs
│   │   ├── Player.cs
│   │   ├── Card.cs
│   │   ├── Companion.cs
│   │   ├── Deck.cs
│   │   ├── Enemy.cs
│   │   ├── BattleState.cs
│   │   ├── CardEffect.cs
│   │   ├── Graph.cs
│   │   ├── Node.cs
│   │   ├── NodeEvent.cs
│   │   └── EventDefinition.cs
│   ├── Repositories/
│   │   ├── StateRepository.cs
│   │   ├── BaseCardRepository.cs
│   │   ├── CardEffectRepository.cs
│   │   ├── EnemyRepository.cs
│   │   ├── EventRepository.cs
│   │   └── StatusRepository.cs
│   ├── Services/
│   │   ├── BattleService.cs
│   │   ├── CardEffectService.cs
│   │   ├── CompanionAbilityService.cs
│   │   ├── CompanionService.cs
│   │   ├── DeckService.cs
│   │   ├── EnemySpawnerService.cs
│   │   ├── EventSpawnerService.cs
│   │   ├── GameLogicService.cs
│   │   ├── LevelingService.cs
│   │   ├── MapGeneratorService.cs
│   │   ├── PersistenceService.cs
│   │   └── StatusEffectService.cs
│   └── data/                         ← symlink or copy of backend/data/
│       ├── static/
│       │   ├── base-cards.json
│       │   ├── card-effects.json
│       │   ├── companions.json
│       │   ├── enemies.json
│       │   ├── events.json
│       │   └── status-definitions.json
│       └── saves/
│           └── game-state.json
├── TheGameIsOn.Tests/
│   ├── TheGameIsOn.Tests.csproj
│   └── SpawnTests.cs
└── TheGameIsOn.sln
```

---

## Key Architectural Decisions

| Concern | TypeScript | C# |
|---|---|---|
| HTTP framework | Express 4 | ASP.NET Core 9 Minimal or Controller-based |
| Serialization | `JSON.parse` / `JSON.stringify` | `System.Text.Json` with `JsonPropertyName` |
| Dependency Injection | Manual `new` in controller | Built-in `IServiceCollection` |
| File I/O | `fs.promises` | `File.ReadAllTextAsync` / `File.WriteAllTextAsync` |
| Immutability | Spread `{ ...obj }` | `record` types + `with` expressions |
| Null safety | `?? undefined` | Nullable reference types (`?`) |
| CORS | `cors()` middleware | `builder.Services.AddCors()` |
| Testing | Manual assert script | xUnit + FluentAssertions |

---

## Rules for Every Phase

1. **Read only the plan doc for that phase** — never dump the entire TS codebase.
2. **Paste the relevant TS source** inline in the prompt so the AI has the exact code.
3. **One conversation per phase** — don't mix phases.
4. **Validate before moving on** — `dotnet build` must pass after each phase.
5. **JSON property casing** — use `camelCase` via `JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase` so the frontend stays unchanged.
6. **Same port** — bind to `http://localhost:4000` to keep the frontend config intact.
7. **Same data files** — the C# project reads from the same `data/` folder; no schema changes.
