namespace TheGameIsOn.API.Models;

/// <summary>
/// Static definition of a status effect (read from status-definitions.json).
/// This is the template; runtime instances live as <see cref="StatusEffect"/> on targets.
/// </summary>
public record StatusEffectDefinition
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Icon { get; init; } = string.Empty;
    public StatusTriggerMoment TriggerMoment { get; init; }
    /// <summary>CardEffect id resolved each tick (e.g. damage effect for poison).</summary>
    public string TickEffectId { get; init; } = string.Empty;
    /// <summary>How many stacks are removed after each tick.</summary>
    public int DecayPerTick { get; init; }
    public string Description { get; init; } = string.Empty;
}
