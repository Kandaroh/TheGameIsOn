using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Repositories;

public interface IStatusRepository
{
    Task<List<StatusEffectDefinition>> GetAllAsync();
    Task<StatusEffectDefinition?> GetByIdAsync(string id);
}

/// <summary>
/// Reads and caches status-definitions.json.
/// The cache is populated on first access and held for the process lifetime.
/// </summary>
public class StatusRepository : IStatusRepository
{
    private readonly string _filePath;
    private Dictionary<string, StatusEffectDefinition>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public StatusRepository(IConfiguration configuration)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "status-definitions.json");
    }

    public async Task<List<StatusEffectDefinition>> GetAllAsync()
    {
        var map = await EnsureCacheAsync();
        return map.Values.ToList();
    }

    public async Task<StatusEffectDefinition?> GetByIdAsync(string id)
    {
        var map = await EnsureCacheAsync();
        return map.GetValueOrDefault(id);
    }

    private async Task<Dictionary<string, StatusEffectDefinition>> EnsureCacheAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<StatusEffectDefinition> defs;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                defs = JsonSerializer.Deserialize<List<StatusEffectDefinition>>(raw, JsonDefaults.Options) ?? new();
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
