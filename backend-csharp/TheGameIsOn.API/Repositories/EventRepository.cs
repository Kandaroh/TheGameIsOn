using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Repositories;

public interface IEventRepository
{
    Task<List<EventDefinition>> GetAllAsync();
    Task<EventDefinition?> GetByIdAsync(string id);
    Task<EventDefinition?> GetByTypeAsync(string type);
    void ClearCache();
}

public class EventRepository : IEventRepository
{
    private readonly string _filePath;
    private Dictionary<string, EventDefinition>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public EventRepository(IConfiguration configuration)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "events.json");
    }

    public async Task<List<EventDefinition>> GetAllAsync()
    {
        var map = await EnsureCacheAsync();
        return map.Values.ToList();
    }

    public async Task<EventDefinition?> GetByIdAsync(string id)
    {
        var map = await EnsureCacheAsync();
        return map.GetValueOrDefault(id);
    }

    /// <summary>Look up by the <c>type</c> field (e.g. "hard battle").</summary>
    public async Task<EventDefinition?> GetByTypeAsync(string type)
    {
        var all = await GetAllAsync();
        return all.Find(e => e.Type == type);
    }

    /// <summary>Clears the in-memory cache so the next read reloads from disk.</summary>
    public void ClearCache()
    {
        _cache = null;
    }

    private async Task<Dictionary<string, EventDefinition>> EnsureCacheAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<EventDefinition> defs;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                defs = JsonSerializer.Deserialize<List<EventDefinition>>(raw, JsonDefaults.Options) ?? new();
            }
            catch
            {
                defs = new();
            }

            _cache = defs.ToDictionary(d => d.Id);
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }
}
