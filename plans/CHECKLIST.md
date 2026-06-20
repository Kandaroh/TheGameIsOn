# Migration Checklist

Use this to track progress. Check each box when the phase is **complete and compiles**.

## Phase Completion

- [x] **Phase 0** — Read overview, understand structure
- [x] **Phase 1** — Scaffold: solution, projects, `Program.cs`, folders
- [x] **Phase 2** — Models: all 12 model files ported (zero logic)
- [x] **Phase 3** — Repositories: all 6 repos + interfaces + `JsonDefaults` helper
- [x] **Phase 4** — Services A: `DeckService`, `CardEffectService`, `CompanionAbilityService`, `LevelingService`
- [x] **Phase 5** — Services B: `StatusEffectService`, `EnemySpawnerService`, `BattleService`
- [x] **Phase 6** — Services C: `MapGeneratorService`, `EventSpawnerService`, `CompanionService`, `PersistenceService`, `GameLogicService`
- [x] **Phase 7** — Controller: `GameController` with all 17 endpoints + request DTOs
- [x] **Phase 8** — DI wiring: all registrations in `Program.cs`, smoke test passes
- [ ] **Phase 9** — Tests: xUnit project, all tests green

## Per-Phase Prompt Recipe

For each phase, copy-paste this into a **new conversation**:

```
I am migrating a TypeScript/Express backend to C# / ASP.NET Core 9.
Here is the plan for this phase:

<paste the phase markdown>

Here is the source code to convert:

<paste ONLY the TS files listed in that phase>

Here are the C# types/interfaces already created in previous phases:

<paste ONLY the interface signatures, not full implementations>

Please generate the complete C# files.
```

This keeps each prompt **minimal** and avoids re-sending the entire codebase.

## File Count Summary

| Category | Files |
|---|---|
| Models | 12 |
| Repositories | 6 (+6 interfaces) |
| Services | 12 (+12 interfaces) |
| Helpers | 1 (`JsonDefaults.cs`) |
| Controller | 1 |
| Request DTOs | 7 |
| Startup | 2 (`Program.cs`, `appsettings.json`) |
| Project files | 3 (`.sln`, 2x `.csproj`) |
| Tests | 4 test classes |
| **Total C# files** | **~48** |

## Emergency Rollback
The TS backend remains untouched throughout. If anything goes wrong, the original `backend/` still works.
