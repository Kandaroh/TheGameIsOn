# Phase 3 — Repositories

## Goal
Port all 6 TypeScript repository files to C# classes in `Repositories/`. Each repo reads a JSON file from disk, deserialises it into the C# models from Phase 2, and caches the result.

## Prompt Template
> Paste the 6 TS repo files (~260 lines total) **plus** the list of C# model type names from Phase 2 into the prompt, then:

```
Convert every TypeScript repository class below into a C# class in
namespace TheGameIsOn.API.Repositories.

Rules:
- Inject `IConfiguration` to resolve the data root path via config key "DataRoot".
- Use System.Text.Json for deserialisation with the same JsonSerializerOptions
  used globally (camelCase, ignore-null).
- Each repo that caches must use a Lazy<Task<T>> or simple nullable field + lock
  to be thread-safe under the DI singleton lifetime.
- Expose an interface (e.g. IEnemyRepository) so DI registration is clean.
- File I/O: File.ReadAllTextAsync / File.WriteAllTextAsync.
- On missing/malformed file: return empty collection (match TS behaviour).
- One file per repo. Interface + implementation in the same file is fine.
```

## File-by-File Mapping

| TS File | C# File | Interface | Key Methods |
|---|---|---|---|
| `state-repo.ts` | `StateRepository.cs` | `IStateRepository` | `Task<GameState> LoadAsync()`, `Task SaveAsync(GameState)` |
| `base-card-repo.ts` | `BaseCardRepository.cs` | `IBaseCardRepository` | `Task<List<Card>> GetAllAsync()` |
| `card-effect-repo.ts` | `CardEffectRepository.cs` | `ICardEffectRepository` | `Task<List<CardEffect>> GetAllAsync()`, `Task<CardEffect?> GetByIdAsync(string)` |
| `enemy-repo.ts` | `EnemyRepository.cs` | `IEnemyRepository` | `Task<List<EnemyDefinition>> GetAllAsync()`, `Task<EnemyDefinition?> GetByIdAsync(string)`, `void ClearCache()` |
| `event-repo.ts` | `EventRepository.cs` | `IEventRepository` | `Task<List<EventDefinition>> GetAllAsync()`, `Task<EventDefinition?> GetByIdAsync(string)`, `Task<EventDefinition?> GetByTypeAsync(string)`, `void ClearCache()` |
| `status-repo.ts` | `StatusRepository.cs` | `IStatusRepository` | `Task<List<StatusEffectDefinition>> GetAllAsync()`, `Task<StatusEffectDefinition?> GetByIdAsync(string)` |

## Special Attention

### `StatusEffectDefinition`
In the TS codebase this type is **defined inside `status-repo.ts`**, not in the models folder. In C# move it into `Models/StatusEffectDefinition.cs` for consistency and reference it from the repo.

### `StateRepository` migration guards
The TS `load()` patches missing fields on older saves:
```ts
if (state.player.encounterCount === undefined) {
  (state.player as any).encounterCount = 0;
}
```
Replicate this in C# by checking for `default` values after deserialisation and assigning defaults. Since we use `int` (defaults to 0), the JSON deserialiser already handles this — but the `nextLevelExp` stamp on companions still needs the `LevelingService` call. Accept `ILevelingService` as a constructor dependency.

### Path resolution
All TS repos use:
```ts
path.resolve(__dirname, '../../data/static/xyz.json')
```
In C# resolve from the `DataRoot` config value:
```csharp
var root = configuration["DataRoot"] ?? "data";
_filePath = Path.Combine(root, "static", "xyz.json");
```

### Serialiser options helper
Create a shared static helper so every repo uses the same options:
```csharp
// Helpers/JsonDefaults.cs
public static class JsonDefaults
{
    public static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };
}
```

## Validation
```powershell
dotnet build
```
All repos compile. No runtime test yet — that comes after services exist.
