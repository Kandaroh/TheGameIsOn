using TheGameIsOn.API.Models;
using TheGameIsOn.API.Repositories;

namespace TheGameIsOn.API.Services;

public record SpawnContext
{
    public MapArea? Area { get; init; }
    public string Difficulty { get; init; } = "normal";
    public int EncounterCount { get; init; }
    public string? EventId { get; init; }
}

public interface IEnemySpawnerService
{
    Task<List<BattleEnemy>> SpawnEnemies(SpawnContext context);
}

/// <summary>
/// Governs which enemies appear at the start of a battle node.
/// </summary>
public class EnemySpawnerService : IEnemySpawnerService
{
    private const int DefaultMinEnemies = 1;
    private const int DefaultMaxEnemies = 3;
    private const double LevelPerEncounter = 0.5;
    private const double HardDifficultyMultiplier = 1.4;
    private const double RewardScalePerLevel = 0.2;

    private readonly IEnemyRepository _enemyRepo;
    private readonly IEventRepository _eventRepo;
    private readonly ICardEffectRepository _cardEffectRepo;

    public EnemySpawnerService(
        IEnemyRepository enemyRepo,
        IEventRepository eventRepo,
        ICardEffectRepository cardEffectRepo)
    {
        _enemyRepo = enemyRepo;
        _eventRepo = eventRepo;
        _cardEffectRepo = cardEffectRepo;
    }

    public async Task<List<BattleEnemy>> SpawnEnemies(SpawnContext context)
    {
        MonsterSpawnConfig? spawnCfg = null;
        if (context.EventId is not null)
        {
            var eventDef = await _eventRepo.GetByIdAsync(context.EventId);
            if (eventDef?.MonsterSpawning is not null)
                spawnCfg = eventDef.MonsterSpawning;
        }

        var minEnemies = spawnCfg?.CountMin ?? DefaultMinEnemies;
        var maxEnemies = spawnCfg?.CountMax ?? DefaultMaxEnemies;
        var diffMod = spawnCfg?.DifficultyModifier ?? 1.0;

        var all = await _enemyRepo.GetAllAsync();

        // Filter by area and level
        var filterAreas = spawnCfg?.PoolFilter?.Areas;
        var filterMinLvl = spawnCfg?.PoolFilter?.MinLevel;
        var filterMaxLvl = spawnCfg?.PoolFilter?.MaxLevel;

        var pool = all.Where(def =>
        {
            if (filterAreas is { Count: > 0 })
            {
                if (def.SpawnArea is not null)
                {
                    var defArea = Enum.TryParse<MapArea>(def.SpawnArea, true, out var parsed) ? parsed : (MapArea?)null;
                    if (defArea.HasValue && !filterAreas.Contains(defArea.Value)) return false;
                }
            }
            else if (context.Area.HasValue)
            {
                if (def.SpawnArea is not null)
                {
                    var defArea = Enum.TryParse<MapArea>(def.SpawnArea, true, out var parsed) ? parsed : (MapArea?)null;
                    if (defArea.HasValue && defArea.Value != context.Area.Value) return false;
                }
            }

            if (filterMinLvl.HasValue && def.Level < filterMinLvl.Value) return false;
            if (filterMaxLvl.HasValue && def.Level > filterMaxLvl.Value) return false;
            return true;
        }).ToList();

        if (pool.Count == 0)
        {
            return await BuildEnemies(all.Take(minEnemies).ToList(), context, diffMod);
        }

        // Roll each candidate against its spawnChance
        var diffMult = (context.Difficulty == "hard" ? HardDifficultyMultiplier : 1.0) * diffMod;
        var rolled = pool.Where(def => Random.Shared.NextDouble() < def.SpawnChance * diffMult).ToList();

        // Enforce min / max counts
        List<EnemyDefinition> selected;
        if (rolled.Count == 0)
        {
            selected = pool.OrderByDescending(d => d.SpawnChance).Take(minEnemies).ToList();
        }
        else if (rolled.Count > maxEnemies)
        {
            selected = rolled.OrderByDescending(d => d.SpawnChance).Take(maxEnemies).ToList();
        }
        else
        {
            selected = rolled;
        }

        return await BuildEnemies(selected, context, diffMod);
    }

    // -------------------------------------------------------------------------

    private async Task<List<BattleEnemy>> BuildEnemies(
        List<EnemyDefinition> definitions, SpawnContext context, double difficultyModifier = 1.0)
    {
        var results = new List<BattleEnemy>();

        foreach (var def in definitions)
        {
            var level = ComputeLevel(def, context);
            var rewards = ScaleRewards(def.Rewards, def.Level, level);

            var levelDelta = level - def.Level;
            var hpMult = (1 + levelDelta * 0.15) * difficultyModifier;
            var life = (int)Math.Round(def.BaseLife * hpMult);

            var attackSummaries = new List<AttackSummary>();
            foreach (var atk in def.Attacks)
            {
                var effect = await _cardEffectRepo.GetByIdAsync(atk.EffectId);
                attackSummaries.Add(new AttackSummary
                {
                    Name = atk.Name,
                    Description = effect?.Description ?? "",
                    Element = atk.Element?.ToString()?.ToLowerInvariant()
                });
            }

            var uid = $"{def.Id}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString("N")[..4]}";

            results.Add(new BattleEnemy
            {
                Id = uid,
                DefinitionId = def.Id,
                Name = def.Name,
                Type = def.Type,
                Element = def.Element?.ToString()?.ToLowerInvariant(),
                Life = life,
                MaxLife = life,
                Shield = 0,
                Energy = def.BaseEnergy,
                MaxEnergy = def.BaseEnergy,
                Level = level,
                ExpReward = (int)Math.Round(def.ExpReward * (1 + levelDelta * RewardScalePerLevel)),
                Rewards = rewards,
                AttackSummaries = attackSummaries
            });
        }

        return results;
    }

    private int ComputeLevel(EnemyDefinition def, SpawnContext context)
    {
        var bonus = (int)Math.Floor(context.EncounterCount * LevelPerEncounter);
        var diffBonus = context.Difficulty == "hard" ? 1 : 0;
        return def.Level + bonus + diffBonus;
    }

    private static List<EnemyReward> ScaleRewards(
        List<EnemyReward> rewards, int baseLevel, int computedLevel)
    {
        var levelDelta = computedLevel - baseLevel;
        if (levelDelta == 0) return rewards;

        return rewards.Select(r =>
        {
            if (r.Type == "gold" || r.Type == "exp")
            {
                return r with { Value = (int)Math.Round(r.Value * (1 + levelDelta * RewardScalePerLevel)) };
            }
            return r;
        }).ToList();
    }
}
