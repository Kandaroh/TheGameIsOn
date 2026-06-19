namespace TheGameIsOn.API.Models;

public record GraphEdge
{
    public string From { get; init; } = string.Empty;
    public string To { get; init; } = string.Empty;
}

public record Graph
{
    public List<NodeDefinition> Nodes { get; init; } = new();
    public List<GraphEdge> Edges { get; init; } = new();
}
