namespace TheGameIsOn.API.Models;

public record Player
{
    public string Id { get; init; } = string.Empty;
    public int Life { get; init; }
    public int Mana { get; init; }
    public Deck Deck { get; init; } = new();
    public List<string> Hand { get; init; } = new();
    public List<string> Discard { get; init; } = new();
    public string Position { get; init; } = string.Empty;
    public int Gold { get; init; }
    /// <summary>
    /// Total number of battle encounters started in this session.
    /// Drives enemy level scaling.
    /// </summary>
    public int EncounterCount { get; init; }
}
