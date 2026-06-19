using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Repositories;

public interface IEnemyRepository
{
    Task<List<EnemyDefinition>> GetAllAsync();
    Task<EnemyDefinition?> GetByIdAsync(string id);
    Task<List<EnemyDefinition>> GetForSpawnAsync();
    void ClearCache();
}

public class EnemyRepository : IEnemyRepository
{
    private readonly string _filePath;
    private Dictionary<string, EnemyDefinition>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private readonly ILogger<EnemyRepository> _logger;

    public EnemyRepository(IConfiguration configuration, ILogger<EnemyRepository> logger)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "enemies.json");
        _logger = logger;
    }

    public async Task<List<EnemyDefinition>> GetAllAsync()
    {
        var map = await EnsureCacheAsync();
        return map.Values.ToList();
    }

    public async Task<EnemyDefinition?> GetByIdAsync(string id)
    {
        var map = await EnsureCacheAsync();
        return map.GetValueOrDefault(id);
    }

    /// <summary>
    /// Returns all enemies eligible for spawning.
    /// Filtering by area / difficulty is handled upstream by EnemySpawnerService.
    /// </summary>
    public Task<List<EnemyDefinition>> GetForSpawnAsync() => GetAllAsync();

    /// <summary>Clears the in-memory cache so the next read reloads from disk.</summary>
    public void ClearCache()
    {
        _cache = null;
    }

    private async Task<Dictionary<string, EnemyDefinition>> EnsureCacheAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<EnemyDefinition> defs;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                defs = JsonSerializer.Deserialize<List<EnemyDefinition>>(raw, JsonDefaults.Options) ?? new();
            }
            catch
            {
                defs = new();
            }

            // Validate: each enemy should have exactly 3 attacks.
            foreach (var def in defs)
            {
                if (def.Attacks.Count != 3)
                {
                    _logger.LogWarning(
                        "[EnemyRepository] Enemy \"{Name}\" ({Id}) has {Count} attack(s) — expected 3.",
                        def.Name, def.Id, def.Attacks.Count);
                }
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
