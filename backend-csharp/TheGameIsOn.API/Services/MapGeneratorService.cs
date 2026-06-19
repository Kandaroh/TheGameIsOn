using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public record MapGenerationOptions
{
    public int MinNodes { get; init; } = 20;
    public int MaxNodes { get; init; } = 24;
    public int MinLayers { get; init; } = 5;
    public int MaxLayers { get; init; } = 7;
}

public interface IMapGeneratorService
{
    Graph Generate(MapGenerationOptions? options = null);
}

public class MapGeneratorService : IMapGeneratorService
{
    private static readonly MapArea[] AreaProgression =
        { MapArea.Forest, MapArea.Dungeon, MapArea.Ruins, MapArea.Volcano };

    private static readonly Dictionary<string, string> NodeIcons = new()
    {
        ["start"]       = "🏁",
        ["end"]         = "🏁",
        ["battle"]      = "⚔️",
        ["hard battle"] = "💀",
        ["new object"]  = "🪄",
        ["power up"]    = "⚡",
        ["treasure"]    = "🎁",
        ["rest"]        = "🛌"
    };

    private MapArea AreaForLayer(int layerIndex, int totalIntermediateLayers)
    {
        var bucket = Math.Min(
            (int)Math.Floor((double)layerIndex / totalIntermediateLayers * AreaProgression.Length),
            AreaProgression.Length - 1);
        return AreaProgression[bucket];
    }

    public Graph Generate(MapGenerationOptions? options = null)
    {
        options ??= new MapGenerationOptions();

        var totalNodes = RandomInt(options.MinNodes, options.MaxNodes);
        var layerCount = RandomInt(options.MinLayers, options.MaxLayers);
        var intermediateNodes = totalNodes - 2;
        var layerSizes = DistributeNodes(intermediateNodes, layerCount - 2);
        var intermediateLayers = layerCount - 2;
        var layers = new List<List<NodeDefinition>>();

        // Start
        layers.Add(new List<NodeDefinition>
        {
            BuildNode("start", "Start", "start", new NodeLayout(50, 0))
        });

        var nodeIndex = 1;
        for (var layer = 1; layer < layerCount - 1; layer++)
        {
            var count = layerSizes[layer - 1];
            var y = Math.Round((double)layer * 100 / (layerCount - 1));
            var area = AreaForLayer(layer - 1, intermediateLayers);
            var layerNodes = new List<NodeDefinition>();

            for (var index = 0; index < count; index++)
            {
                var eventType = RandomEventType();
                layerNodes.Add(BuildNode(
                    $"node-{nodeIndex}",
                    $"{NodeTitle(eventType)} {nodeIndex + 1}",
                    eventType,
                    PositionForLayer(index, count, y),
                    area));
                nodeIndex++;
            }

            layers.Add(layerNodes);
        }

        // End
        layers.Add(new List<NodeDefinition>
        {
            BuildNode("end", "End", "end", new NodeLayout(50, 100))
        });

        var edges = new List<GraphEdge>();
        for (var layer = 0; layer < layers.Count - 1; layer++)
        {
            var sourceLayer = layers[layer];
            var targetLayer = layers[layer + 1];

            foreach (var source in sourceLayer)
            {
                var targets = PickNearestTargets(source, targetLayer, 1, Math.Min(2, targetLayer.Count));
                foreach (var target in targets)
                    edges.Add(new GraphEdge { From = source.Id, To = target.Id });
            }

            foreach (var target in targetLayer)
            {
                var hasIncoming = edges.Any(e => e.To == target.Id);
                if (!hasIncoming)
                {
                    var source = RandomPick(sourceLayer);
                    edges.Add(new GraphEdge { From = source.Id, To = target.Id });
                }
            }
        }

        AddExtraConnections(layers, edges);

        var nodes = layers.SelectMany(l => l).ToList();
        return new Graph { Nodes = nodes, Edges = edges };
    }

    // -------------------------------------------------------------------------

    private static NodeDefinition BuildNode(string id, string title, string eventType,
        NodeLayout layout, MapArea? area = null)
    {
        return new NodeDefinition
        {
            Id = id,
            Title = title,
            Icon = NodeIcons.GetValueOrDefault(eventType, "◯"),
            Layout = layout,
            Event = new NodeEvent
            {
                Type = eventType == "start" || eventType == "end" ? eventType : eventType,
                Area = area
            }
        };
    }

    private static string NodeTitle(string eventType) => eventType switch
    {
        "battle"      => "Battle",
        "hard battle" => "Hard Battle",
        "new object"  => "New Object",
        "power up"    => "Power Up",
        "treasure"    => "Treasure",
        "rest"        => "Rest",
        _             => "Node"
    };

    private static string RandomEventType()
    {
        var choice = Random.Shared.NextDouble();
        if (choice < 0.55) return "battle";
        if (choice < 0.75) return "treasure";
        if (choice < 0.85) return "rest";
        if (choice < 0.93) return "hard battle";
        if (choice < 0.97) return "new object";
        return "power up";
    }

    private static NodeLayout PositionForLayer(int index, int count, double y)
    {
        var x = count == 1 ? 50.0 : 15.0 + 70.0 * index / (count - 1);
        return new NodeLayout(x, y);
    }

    private static List<int> DistributeNodes(int total, int layers)
    {
        var baseCount = total / layers;
        var remainder = total % layers;
        return Enumerable.Range(0, layers)
            .Select(i => baseCount + (i < remainder ? 1 : 0))
            .ToList();
    }

    private static int RandomInt(int min, int max) =>
        Random.Shared.Next(min, max + 1);

    private static T RandomPick<T>(List<T> items) =>
        items[Random.Shared.Next(items.Count)];

    private static void AddExtraConnections(List<List<NodeDefinition>> layers, List<GraphEdge> edges)
    {
        for (var layerIndex = 0; layerIndex < layers.Count - 2; layerIndex++)
        {
            var sourceLayer = layers[layerIndex];
            var targetLayer = layers[layerIndex + 2];

            foreach (var source in sourceLayer)
            {
                if (Random.Shared.NextDouble() < 0.18)
                {
                    var candidates = PickNearestTargets(source, targetLayer, 1, Math.Min(2, targetLayer.Count));
                    if (candidates.Count > 0)
                        edges.Add(new GraphEdge { From = source.Id, To = candidates[0].Id });
                }
            }
        }
    }

    private static List<NodeDefinition> PickNearestTargets(
        NodeDefinition source, List<NodeDefinition> targets, int min, int max)
    {
        var sx = source.Layout?.X ?? 0;
        var sorted = targets.OrderBy(t => Math.Abs((t.Layout?.X ?? 0) - sx)).ToList();
        var k = Math.Max(min, Math.Min(max, sorted.Count));
        return sorted.Take(k).ToList();
    }
}
