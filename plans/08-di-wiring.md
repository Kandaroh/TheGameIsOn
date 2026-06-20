# Phase 8 — Dependency Injection & Final Wiring

## Goal
Wire all services and repositories into `Program.cs`, verify the app starts, and confirm every endpoint responds.

## Prompt Template
> This phase requires **no TS source**. Just paste the list of interfaces + implementations and this doc.

```
Wire the following services into Program.cs using the ASP.NET Core DI container.
All repositories are Singletons (they cache). All services are Singletons
(they are stateless or use thread-safe patterns). The controller is Transient
(default for controllers).
```

## Registration Order

```csharp
// --- Helpers ---
// JsonDefaults.Options is a static field — no registration needed.

// --- Repositories (Singleton — they cache in memory) ---
builder.Services.AddSingleton<IBaseCardRepository, BaseCardRepository>();
builder.Services.AddSingleton<ICardEffectRepository, CardEffectRepository>();
builder.Services.AddSingleton<IEnemyRepository, EnemyRepository>();
builder.Services.AddSingleton<IEventRepository, EventRepository>();
builder.Services.AddSingleton<IStatusRepository, StatusRepository>();

// --- Services (Singleton — stateless logic) ---
builder.Services.AddSingleton<IDeckService, DeckService>();
builder.Services.AddSingleton<ICardEffectService, CardEffectService>();
builder.Services.AddSingleton<ICompanionAbilityService, CompanionAbilityService>();
builder.Services.AddSingleton<ILevelingService, LevelingService>();
builder.Services.AddSingleton<IMapGeneratorService, MapGeneratorService>();
builder.Services.AddSingleton<IEventSpawnerService, EventSpawnerService>();
builder.Services.AddSingleton<ICompanionService, CompanionService>();
builder.Services.AddSingleton<IStatusEffectService, StatusEffectService>();
builder.Services.AddSingleton<IEnemySpawnerService, EnemySpawnerService>();
builder.Services.AddSingleton<IGameLogicService, GameLogicService>();
builder.Services.AddSingleton<IPersistenceService>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var root = config["DataRoot"] ?? "data";
    var filePath = Path.Combine(root, "saves", "game-state.json");
    return new PersistenceService(filePath, sp.GetRequiredService<IGameLogicService>());
});
builder.Services.AddSingleton<IStateRepository, StateRepository>();
// StateRepository depends on IPersistenceService + ILevelingService.

builder.Services.AddSingleton<IBattleService, BattleService>();
```

> Adjust if any service has a different constructor signature. The key constraint is that **nothing is Scoped** — there is no per-request DB context.

## Final `Program.cs` Structure

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;
using TheGameIsOn.API.Repositories;
using TheGameIsOn.API.Services;

var builder = WebApplication.CreateBuilder(args);

// CORS
builder.Services.AddCors(options => { /* ... */ });

// JSON
builder.Services.AddControllers().AddJsonOptions(opts => { /* camelCase, ignoreNull */ });

// DI — repos
// DI — services
// (see above)

var app = builder.Build();

app.UseCors();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "4000";
app.Run($"http://localhost:{port}");
```

## Smoke Test Checklist

```powershell
dotnet run --project TheGameIsOn.API
```

Then in another terminal:

```powershell
# 1. Health — should return current state or create a new one
curl http://localhost:4000/api/game/state

# 2. New run
curl -X POST http://localhost:4000/api/game/action/new-run

# 3. Companions list
curl http://localhost:4000/api/game/action/companions

# 4. Event definitions
curl http://localhost:4000/api/game/events/definitions

# 5. Move (use a valid node id from the state)
curl -X POST http://localhost:4000/api/game/action/move -H "Content-Type: application/json" -d "{\"nextNodeId\":\"node-1\"}"
```

Every response must be valid JSON with **camelCase** keys, matching what the TS backend returns.

## Common Pitfalls

| Issue | Fix |
|---|---|
| `JsonException` on enum with spaces (`"hard battle"`) | Use a custom `JsonConverter` or model as `string` instead of enum |
| `null` instead of `[]` for empty arrays | Ensure model properties default to `new List<T>()` or `[]` |
| `FileNotFoundException` on data files | Check `DataRoot` relative path — run from `backend-csharp/` dir |
| Circular dependency at startup | Use `Lazy<T>` wrapper or re-order registrations |
| CORS preflight fails | Ensure `AllowAnyMethod()` includes OPTIONS |

## Validation
All 5 curl commands return correct JSON. The frontend can be pointed at `http://localhost:4000` and should work identically.
