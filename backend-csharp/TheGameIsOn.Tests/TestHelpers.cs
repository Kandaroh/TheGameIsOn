using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using TheGameIsOn.API.Repositories;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.Tests;

/// <summary>
/// Shared configuration and service factory for integration tests.
/// Points DataRoot at the real backend/data folder so tests read actual JSON files.
/// </summary>
public static class TestHelpers
{
    public static IConfiguration BuildConfig()
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DataRoot"] = Path.Combine("..", "..", "..", "..", "..", "backend", "data")
            })
            .Build();
    }

    public static IEventRepository EventRepo() => new EventRepository(BuildConfig());
    public static IEnemyRepository EnemyRepo() => new EnemyRepository(BuildConfig(), NullLogger<EnemyRepository>.Instance);
    public static IBaseCardRepository BaseCardRepo() => new BaseCardRepository(BuildConfig());
    public static ICardEffectRepository CardEffectRepo() => new CardEffectRepository(BuildConfig());
    public static IStatusRepository StatusRepo() => new StatusRepository(BuildConfig());
    public static IEventSpawnerService EventSpawner() => new EventSpawnerService(EventRepo());
    public static IMapGeneratorService MapGenerator() => new MapGeneratorService();
    public static IGameLogicService GameLogic() => new GameLogicService(MapGenerator(), EventSpawner());
    public static IDeckService DeckService() => new DeckService();
    public static ILevelingService LevelingService() => new LevelingService();
}
