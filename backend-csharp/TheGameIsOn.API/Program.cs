using System.Text.Json;
using TheGameIsOn.API.Repositories;
using TheGameIsOn.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("app-config.json", optional: true, reloadOnChange: false);

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// --- JSON serialisation (camelCase to match existing frontend) ---
builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        opts.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        opts.JsonSerializerOptions.DefaultIgnoreCondition =
            System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
    });

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
builder.Services.AddSingleton<IPersistenceService, PersistenceService>();
builder.Services.AddSingleton<IStateRepository, StateRepository>();
builder.Services.AddSingleton<IBattleService, BattleService>();

var app = builder.Build();

app.UseCors();
app.MapControllers();

var port = Environment.GetEnvironmentVariable("PORT") ?? "4000";
app.Run($"http://localhost:{port}");
