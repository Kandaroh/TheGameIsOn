using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Repositories;

public interface IBaseCardRepository
{
    Task<List<Card>> GetAllAsync();
}

/// <summary>
/// Reads and caches the base-cards.json data file.
/// Base cards are the element-neutral starter cards that every run begins with.
/// The file is read once and held for the process lifetime — it is treated as read-only.
/// </summary>
public class BaseCardRepository : IBaseCardRepository
{
    private readonly string _filePath;
    private List<Card>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public BaseCardRepository(IConfiguration configuration)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "base-cards.json");
    }

    public async Task<List<Card>> GetAllAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<Card> cards;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                cards = JsonSerializer.Deserialize<List<Card>>(raw, JsonDefaults.Options) ?? new();
            }
            catch
            {
                cards = new();
            }

            _cache = cards;
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }
}
