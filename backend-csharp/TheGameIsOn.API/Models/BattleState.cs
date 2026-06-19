using System.Text.Json.Serialization;

namespace TheGameIsOn.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter<StatusTriggerMoment>))]
public enum StatusTriggerMoment
{
    [JsonStringEnumMemberName("onApply")]
    OnApply,
    [JsonStringEnumMemberName("turnStart")]
    TurnStart,
    [JsonStringEnumMemberName("turnEnd")]
    TurnEnd
}

public record StatusEffect
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public int Stacks { get; init; }
    /// <summary>Number of turns remaining; null = permanent (until stacks deplete).</summary>
    public int? TurnsRemaining { get; init; }
    public StatusTriggerMoment TriggerMoment { get; init; }
    public string EffectId { get; init; } = string.Empty;
}

public record EnemyTurnAction
{
    public string EnemyId { get; init; } = string.Empty;
    public string EnemyName { get; init; } = string.Empty;
    public string AttackName { get; init; } = string.Empty;
    public string TargetId { get; init; } = string.Empty;
    public string TargetName { get; init; } = string.Empty;
    /// <summary>Damage dealt (after shields). Negative = healing.</summary>
    public int DamageDealt { get; init; }
    /// <summary>True if this action killed the target.</summary>
    public bool KilledTarget { get; init; }
}

public record PendingCardReward
{
    public string CompanionId { get; init; } = string.Empty;
    /// <summary>2-3 cards drawn from the companion's priceDeck tier; player picks one.</summary>
    public List<Card> CardOptions { get; init; } = new();
}

public record AttackSummary
{
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public string? Element { get; init; }
}

/// <summary>Mutable — HP/shield change during combat.</summary>
public class BattleEnemy : IEffectEntity
{
    public string Id { get; set; } = string.Empty;
    public string DefinitionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Life { get; set; }
    public int MaxLife { get; set; }
    public int Shield { get; set; }
    public int Energy { get; set; }
    public int MaxEnergy { get; set; }
    public string? Element { get; set; }
    public string? Type { get; set; }
    public int Level { get; set; }
    public int ExpReward { get; set; }
    public List<EnemyReward> Rewards { get; set; } = new();
    public List<AttackSummary>? AttackSummaries { get; set; }
    /// <summary>Set to the companion id that dealt the killing blow.</summary>
    public string? KilledByCompanionId { get; set; }
    public List<StatusEffect>? StatusEffects { get; set; }
}

/// <summary>Mutable — state evolves each turn.</summary>
public class BattleState
{
    public bool Active { get; set; }
    public List<BattleEnemy> Enemies { get; set; } = new();
    public int Turn { get; set; }
    public List<string> Log { get; set; } = new();
    public List<PendingCardReward> PendingCardRewards { get; set; } = new();
    public List<EnemyTurnAction>? LastTurnActions { get; set; }
}
