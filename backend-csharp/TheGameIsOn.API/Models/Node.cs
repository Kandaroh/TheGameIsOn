namespace TheGameIsOn.API.Models;

public record NodeLayout(double X, double Y);

public record NodeDefinition
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string? Icon { get; init; }
    public NodeLayout? Layout { get; init; }
    public NodeEvent Event { get; init; } = new();
}
