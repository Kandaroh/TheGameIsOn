namespace TheGameIsOn.API.Models;

public record Deck
{
    public List<string> CardIds { get; init; } = new();
}
