namespace TheGameIsOn.API.Models;

public record EnemyAttack
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public CardType Type { get; init; }
    public CardElement? Element { get; init; }
    public CardTarget Targeting { get; init; }
    public CardTargetNumber TargetNumber { get; init; }
    public string EffectId { get; init; } = string.Empty;
    /// <summary>Weight 0-1. Values are normalised at runtime.</summary>
    public double SelectionChance { get; init; }
}

public record EnemyReward
{
    public string Type { get; init; } = string.Empty;
    public int Value { get; init; }
    /// <summary>Only for card-draw: rarity tier of the killing companion's priceDeck.</summary>
    public string? Tier { get; init; }
}

public record EnemyDefinition
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public CardElement? Element { get; init; }
    public int BaseLife { get; init; }
    public int BaseEnergy { get; init; }
    public List<EnemyAttack> Attacks { get; init; } = new();
    public double SpawnChance { get; init; }
    public List<SpecialAbility> SpecialAbilities { get; init; } = new();
    public string? SpawnArea { get; init; }
    public int Level { get; init; }
    public int ExpReward { get; init; }
    public List<EnemyReward> Rewards { get; init; } = new();
}
