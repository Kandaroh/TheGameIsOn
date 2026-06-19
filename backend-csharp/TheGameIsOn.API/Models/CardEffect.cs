using System.Text.Json.Serialization;

namespace TheGameIsOn.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter<CardEffectAction>))]
public enum CardEffectAction
{
    [JsonStringEnumMemberName("damage")]
    Damage,
    [JsonStringEnumMemberName("shield")]
    Shield,
    [JsonStringEnumMemberName("evade")]
    Evade,
    [JsonStringEnumMemberName("evade_draw")]
    EvadeDraw,
    [JsonStringEnumMemberName("heal")]
    Heal,
    [JsonStringEnumMemberName("draw")]
    Draw,
    [JsonStringEnumMemberName("apply_status")]
    ApplyStatus
}

[JsonConverter(typeof(JsonStringEnumConverter<CardEffectTarget>))]
public enum CardEffectTarget
{
    [JsonStringEnumMemberName("wildMonster")]
    WildMonster,
    [JsonStringEnumMemberName("companion")]
    Companion,
    [JsonStringEnumMemberName("deck")]
    Deck,
    [JsonStringEnumMemberName("discard")]
    Discard
}

public record CardEffect
{
    public string Id { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public CardEffectAction Action { get; init; }
    public int Value { get; init; }
    public CardEffectTarget Target { get; init; }
    /// <summary>Status effect id to apply (only used when action is ApplyStatus).</summary>
    public string? StatusId { get; init; }
}
