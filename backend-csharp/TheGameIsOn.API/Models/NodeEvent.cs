using System.Text.Json;
using System.Text.Json.Serialization;

namespace TheGameIsOn.API.Models;

[JsonConverter(typeof(JsonStringEnumConverter<MapArea>))]
public enum MapArea
{
    [JsonStringEnumMemberName("forest")]
    Forest,
    [JsonStringEnumMemberName("dungeon")]
    Dungeon,
    [JsonStringEnumMemberName("ruins")]
    Ruins,
    [JsonStringEnumMemberName("volcano")]
    Volcano
}

/// <summary>
/// Type is kept as a plain string because the TS type is
/// <c>NodeEventType | string</c> — values like "hard battle" contain spaces.
/// </summary>
public record NodeEvent
{
    public string Type { get; init; } = string.Empty;
    public MapArea? Area { get; init; }
    public Dictionary<string, JsonElement>? Payload { get; init; }
}
