using System.Text.Json.Serialization;

namespace TheGameIsOn.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter<SpecialAbilityTrigger>))]
public enum SpecialAbilityTrigger
{
    [JsonStringEnumMemberName("passive")]
    Passive,
    [JsonStringEnumMemberName("activable")]
    Activable
}

[JsonConverter(typeof(JsonStringEnumConverter<PassiveModifierType>))]
public enum PassiveModifierType
{
    [JsonStringEnumMemberName("bonus_damage")]
    BonusDamage,
    [JsonStringEnumMemberName("bonus_shield")]
    BonusShield,
    [JsonStringEnumMemberName("cost_reduction")]
    CostReduction,
    [JsonStringEnumMemberName("conditional_bonus")]
    ConditionalBonus,
    [JsonStringEnumMemberName("retaliation")]
    Retaliation
}

[JsonConverter(typeof(JsonStringEnumConverter<ComparisonOp>))]
public enum ComparisonOp
{
    [JsonStringEnumMemberName("eq")]
    Eq,
    [JsonStringEnumMemberName("neq")]
    Neq,
    [JsonStringEnumMemberName("lt")]
    Lt,
    [JsonStringEnumMemberName("gt")]
    Gt,
    [JsonStringEnumMemberName("lte")]
    Lte,
    [JsonStringEnumMemberName("gte")]
    Gte
}

public record PassiveCondition
{
    public string Field { get; init; } = string.Empty;
    public ComparisonOp Op { get; init; }
    public JsonValue Value { get; init; } = new();
}

/// <summary>
/// Holds a string-or-number value to match the TS <c>string | number</c> type.
/// Serialises as either a JSON string or number depending on content.
/// </summary>
[System.Text.Json.Serialization.JsonConverter(typeof(JsonValueConverter))]
public readonly struct JsonValue
{
    public string? StringValue { get; init; }
    public double? NumberValue { get; init; }

    public static implicit operator JsonValue(string s) => new() { StringValue = s };
    public static implicit operator JsonValue(double n) => new() { NumberValue = n };
}

public sealed class JsonValueConverter : System.Text.Json.Serialization.JsonConverter<JsonValue>
{
    public override JsonValue Read(ref System.Text.Json.Utf8JsonReader reader,
        Type typeToConvert, System.Text.Json.JsonSerializerOptions options)
    {
        if (reader.TokenType == System.Text.Json.JsonTokenType.Number)
            return new JsonValue { NumberValue = reader.GetDouble() };
        if (reader.TokenType == System.Text.Json.JsonTokenType.String)
            return new JsonValue { StringValue = reader.GetString() };
        throw new System.Text.Json.JsonException($"Unexpected token {reader.TokenType} for JsonValue");
    }

    public override void Write(System.Text.Json.Utf8JsonWriter writer, JsonValue value,
        System.Text.Json.JsonSerializerOptions options)
    {
        if (value.NumberValue.HasValue)
            writer.WriteNumberValue(value.NumberValue.Value);
        else
            writer.WriteStringValue(value.StringValue ?? string.Empty);
    }
}

public record PassiveModifier
{
    public PassiveModifierType Type { get; init; }
    public int Value { get; init; }
    public PassiveCondition? Condition { get; init; }
}

public record SpecialAbility
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public SpecialAbilityTrigger Trigger { get; init; }
    /// <summary>Max uses per combat. null = unlimited (passive).</summary>
    public int? UsesPerCombat { get; init; }
    public string EffectId { get; init; } = string.Empty;
    public PassiveModifier? Modifier { get; init; }
}

public record CompanionPriceDecks
{
    public List<Card> Common { get; init; } = new();
    public List<Card> Uncommon { get; init; } = new();
    public List<Card> Rare { get; init; } = new();
}

/// <summary>
/// Mutable class — companions are leveled, gain abilities, and lose HP during battle.
/// </summary>
public class Companion : IEffectEntity
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public CardType Type { get; set; }
    public CardElement? Element { get; set; }
    public int Life { get; set; }
    public int? MaxLife { get; set; }
    public int Energy { get; set; }
    public int? MaxEnergy { get; set; }
    public int EnergyRefill { get; set; }
    public string? Sprite { get; set; }
    public CompanionPriceDecks PriceDecks { get; set; } = new();
    public int Level { get; set; }
    public int Exp { get; set; }
    /// <summary>EXP required to reach the next level. Computed by LevelingService.</summary>
    public int? NextLevelExp { get; set; }
    /// <summary>Ordered level thresholds at which the player picks a new ability.</summary>
    public List<int> AbilityUnlockLevels { get; set; } = new();
    /// <summary>Full menu of possible abilities the player can choose from.</summary>
    public List<SpecialAbility> AbilityPool { get; set; } = new();
    /// <summary>Runtime: chosen abilities (0-3). Starts empty, grows as the player picks.</summary>
    public List<SpecialAbility> SpecialAbilities { get; set; } = new();
    /// <summary>Shield points (transient — reset each combat). Defaults to 0.</summary>
    public int Shield { get; set; }
    public List<StatusEffect>? StatusEffects { get; set; }
}
