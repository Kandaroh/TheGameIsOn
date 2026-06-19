namespace TheGameIsOn.API.Models;

public record PoolFilter
{
    public List<MapArea>? Areas { get; init; }
    public int? MinLevel { get; init; }
    public int? MaxLevel { get; init; }
}

public record MonsterSpawnConfig
{
    public PoolFilter PoolFilter { get; init; } = new();
    public int CountMin { get; init; }
    public int CountMax { get; init; }
    /// <summary>Multiplier applied to enemy base stats when spawned from this event.</summary>
    public double DifficultyModifier { get; init; }
}

public record EventSpawnRules
{
    /// <summary>Minimum number of times this event must appear on a generated map.</summary>
    public int Min { get; init; }
    /// <summary>Maximum occurrences; null = unlimited.</summary>
    public int? Max { get; init; }
    /// <summary>null = allowed in all areas.</summary>
    public List<MapArea>? AllowedAreas { get; init; }
}

public record EventDefinition
{
    public string Id { get; init; } = string.Empty;
    /// <summary>Matches NodeEventType string values used in game state.</summary>
    public string Type { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public EventSpawnRules SpawnRules { get; init; } = new();
    /// <summary>null for non-combat events.</summary>
    public MonsterSpawnConfig? MonsterSpawning { get; init; }
    /// <summary>Human-readable rule overrides shown to the player.</summary>
    public List<string> ExtraRules { get; init; } = new();
    public string Notes { get; init; } = string.Empty;
}
