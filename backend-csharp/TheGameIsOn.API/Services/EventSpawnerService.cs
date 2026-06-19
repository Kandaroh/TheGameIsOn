using TheGameIsOn.API.Models;
using TheGameIsOn.API.Repositories;

namespace TheGameIsOn.API.Services;

public record EventSpec
{
    public string Name { get; init; } = string.Empty;
    public int Min { get; init; }
    public int? Max { get; init; }
}

public interface IEventSpawnerService
{
    Task<List<EventSpec>> GetSpecsAsync();
    Task<(bool Valid, string? Reason)> ValidateCountAsync(string eventType, int count);
    Task<List<NodeDefinition>> AssignEventsAsync(List<NodeDefinition> nodes);
}

public class EventSpawnerService : IEventSpawnerService
{
    private readonly IEventRepository _eventRepo;

    public EventSpawnerService(IEventRepository eventRepo)
    {
        _eventRepo = eventRepo;
    }

    public async Task<List<EventSpec>> GetSpecsAsync()
    {
        var defs = await _eventRepo.GetAllAsync();
        return defs.Select(d => new EventSpec
        {
            Name = d.Type,
            Min = d.SpawnRules.Min,
            Max = d.SpawnRules.Max
        }).ToList();
    }

    public async Task<(bool Valid, string? Reason)> ValidateCountAsync(string eventType, int count)
    {
        var def = await _eventRepo.GetByTypeAsync(eventType);
        if (def is null) return (false, "unknown event type");
        var rules = def.SpawnRules;
        if (rules.Max.HasValue && count > rules.Max.Value) return (false, $"exceeds max {rules.Max}");
        if (count < rules.Min) return (false, $"below min {rules.Min}");
        return (true, null);
    }

    /// <summary>
    /// Assign events to nodes while enforcing spawn caps.
    /// Excess nodes are demoted to "battle"; under-represented types are promoted.
    /// </summary>
    public async Task<List<NodeDefinition>> AssignEventsAsync(List<NodeDefinition> nodes)
    {
        var defs = await _eventRepo.GetAllAsync();
        var rulesMap = new Dictionary<string, (int Min, int? Max)>();
        foreach (var d in defs)
            rulesMap[d.Type] = (d.SpawnRules.Min, d.SpawnRules.Max);

        // Count existing events
        var counts = new Dictionary<string, int>();
        foreach (var n in nodes)
        {
            var t = n.Event.Type;
            counts[t] = counts.GetValueOrDefault(t) + 1;
        }

        // Enforce max caps: demote excess to "battle"
        foreach (var (type, rules) in rulesMap)
        {
            if (!rules.Max.HasValue) continue;
            var current = counts.GetValueOrDefault(type);
            if (current <= rules.Max.Value) continue;

            var toRemove = current - rules.Max.Value;
            for (var i = 0; i < nodes.Count && toRemove > 0; i++)
            {
                if (nodes[i].Event.Type == type)
                {
                    nodes[i] = nodes[i] with
                    {
                        Event = nodes[i].Event with { Type = "battle" }
                    };
                    counts[type] = counts.GetValueOrDefault(type) - 1;
                    counts["battle"] = counts.GetValueOrDefault("battle") + 1;
                    toRemove--;
                }
            }
        }

        // Enforce min caps: promote "battle" nodes
        foreach (var (type, rules) in rulesMap)
        {
            var current = counts.GetValueOrDefault(type);
            if (current >= rules.Min) continue;

            var need = rules.Min - current;
            for (var i = 0; i < nodes.Count && need > 0; i++)
            {
                if (nodes[i].Event.Type == "battle" && nodes[i].Id != "start" && nodes[i].Id != "end")
                {
                    nodes[i] = nodes[i] with
                    {
                        Event = nodes[i].Event with { Type = type }
                    };
                    counts[type] = counts.GetValueOrDefault(type) + 1;
                    counts["battle"] = Math.Max(counts.GetValueOrDefault("battle") - 1, 0);
                    need--;
                }
            }
        }

        return nodes;
    }
}
