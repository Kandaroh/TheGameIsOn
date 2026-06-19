using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Repositories;

public interface ICardEffectRepository
{
    Task<List<CardEffect>> GetAllAsync();
    Task<CardEffect?> GetByIdAsync(string id);
}

/// <summary>
/// Reads and caches the card-effects.json data file.
/// The cache is populated on first access and held for the process lifetime.
/// </summary>
public class CardEffectRepository : ICardEffectRepository
{
    private readonly string _filePath;
    private Dictionary<string, CardEffect>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public CardEffectRepository(IConfiguration configuration)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "card-effects.json");
    }

    public async Task<List<CardEffect>> GetAllAsync()
    {
        var map = await EnsureCacheAsync();
        return map.Values.ToList();
    }

    public async Task<CardEffect?> GetByIdAsync(string id)
    {
        var map = await EnsureCacheAsync();
        return map.GetValueOrDefault(id);
    }

    private async Task<Dictionary<string, CardEffect>> EnsureCacheAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<CardEffect> effects;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                effects = JsonSerializer.Deserialize<List<CardEffect>>(raw, JsonDefaults.Options) ?? new();
            }
            catch
            {
                effects = new();
            }

            _cache = effects.ToDictionary(e => e.Id);
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }
}
