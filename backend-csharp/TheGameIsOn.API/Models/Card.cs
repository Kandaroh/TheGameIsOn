using System.Text.Json;
using System.Text.Json.Serialization;

namespace TheGameIsOn.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter<CardTarget>))]
public enum CardTarget
{
    [JsonStringEnumMemberName("companion")]
    Companion,
    [JsonStringEnumMemberName("wildMonster")]
    WildMonster,
    [JsonStringEnumMemberName("deck")]
    Deck,
    [JsonStringEnumMemberName("discard")]
    Discard
}

/// <summary>
/// Represents 1, 2, or "ALL".
/// Serialised as an int (1/2) or the string "ALL".
/// </summary>
[JsonConverter(typeof(CardTargetNumberConverter))]
public readonly struct CardTargetNumber
{
    public int? NumericValue { get; init; }
    public bool IsAll { get; init; }

    public static CardTargetNumber FromInt(int n) => new() { NumericValue = n };
    public static CardTargetNumber All => new() { IsAll = true };
}

public sealed class CardTargetNumberConverter : JsonConverter<CardTargetNumber>
{
    public override CardTargetNumber Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType == JsonTokenType.Number)
            return CardTargetNumber.FromInt(reader.GetInt32());

        if (reader.TokenType == JsonTokenType.String)
        {
            var s = reader.GetString();
            if (string.Equals(s, "ALL", StringComparison.OrdinalIgnoreCase))
                return CardTargetNumber.All;
        }

        throw new JsonException($"Unexpected token {reader.TokenType} for CardTargetNumber");
    }

    public override void Write(Utf8JsonWriter writer, CardTargetNumber value, JsonSerializerOptions options)
    {
        if (value.IsAll)
            writer.WriteStringValue("ALL");
        else
            writer.WriteNumberValue(value.NumericValue ?? 1);
    }
}

[JsonConverter(typeof(JsonStringEnumConverter<CardElement>))]
public enum CardElement
{
    [JsonStringEnumMemberName("fire")]
    Fire,
    [JsonStringEnumMemberName("water")]
    Water,
    [JsonStringEnumMemberName("earth")]
    Earth,
    [JsonStringEnumMemberName("air")]
    Air,
    [JsonStringEnumMemberName("arcane")]
    Arcane,
    [JsonStringEnumMemberName("shadow")]
    Shadow,
    [JsonStringEnumMemberName("light")]
    Light,
    [JsonStringEnumMemberName("neutral")]
    Neutral
}

[JsonConverter(typeof(JsonStringEnumConverter<CardType>))]
public enum CardType
{
    [JsonStringEnumMemberName("attack")]
    Attack,
    [JsonStringEnumMemberName("defense")]
    Defense,
    [JsonStringEnumMemberName("utility")]
    Utility
}

public record CardEffectRef(string Description);

public record Card
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int Cost { get; init; }
    public CardType Type { get; init; }
    public CardElement? Element { get; init; }
    public string? Description { get; init; }
    public string? Sprite { get; init; }
    public CardTarget? Target { get; init; }
    public CardTargetNumber? TargetNumber { get; init; }
    public Dictionary<string, JsonElement>? Properties { get; init; }
    public string? EffectId { get; init; }
    public string? EnhancedEffectId { get; init; }
    public CardEffectRef? Effect { get; init; }
    public CardEffectRef? EnhancedEffect { get; init; }
}
