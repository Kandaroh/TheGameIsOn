using FluentAssertions;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.Tests;

public class SpawnRuleTests
{
    private readonly IEventSpawnerService _spawner = TestHelpers.EventSpawner();
    private readonly API.Repositories.IEventRepository _eventRepo = TestHelpers.EventRepo();

    [Fact]
    public async Task AssignEvents_Enforces_MaxCaps()
    {
        var nodes = MakeNodes(30, new() { ["rest"] = 5, ["hard battle"] = 6 });
        var result = await _spawner.AssignEventsAsync(nodes);

        var defs = await _eventRepo.GetAllAsync();
        foreach (var def in defs)
        {
            if (def.SpawnRules.Max is { } max)
            {
                result.Count(n => n.Event.Type == def.Type)
                      .Should().BeAtMost(max,
                          $"{def.Type} should not exceed max {max}");
            }
        }
    }

    [Fact]
    public async Task AssignEvents_Enforces_MinCaps()
    {
        var nodes = MakeNodes(30, new());
        var result = await _spawner.AssignEventsAsync(nodes);

        var defs = await _eventRepo.GetAllAsync();
        foreach (var def in defs.Where(d => d.SpawnRules.Min > 0))
        {
            result.Count(n => n.Event.Type == def.Type)
                  .Should().BeAtLeast(def.SpawnRules.Min,
                      $"{def.Type} should meet min {def.SpawnRules.Min}");
        }
    }

    // -------------------------------------------------------------------------
    // Helper — mirrors makeNodes() from the TS test
    // -------------------------------------------------------------------------

    private static List<NodeDefinition> MakeNodes(int count, Dictionary<string, int> preset)
    {
        var nodes = new List<NodeDefinition>
        {
            new() { Id = "start", Title = "Start", Event = new NodeEvent { Type = "start" } }
        };

        var idx = 1;
        foreach (var (type, qty) in preset)
        {
            for (var i = 0; i < qty; i++)
                nodes.Add(new NodeDefinition
                {
                    Id = $"node-{idx++}",
                    Title = $"Node {idx}",
                    Event = new NodeEvent { Type = type }
                });
        }

        while (nodes.Count < count)
        {
            nodes.Add(new NodeDefinition
            {
                Id = $"node-{idx++}",
                Title = $"Node {idx}",
                Event = new NodeEvent { Type = "battle" }
            });
        }

        nodes.Add(new NodeDefinition
        {
            Id = "end",
            Title = "End",
            Event = new NodeEvent { Type = "end" }
        });

        return nodes;
    }
}
