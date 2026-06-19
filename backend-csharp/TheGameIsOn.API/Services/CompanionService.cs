using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface ICompanionService
{
    Task<List<Companion>> GetAllAsync();
}

/// <summary>
/// Loads the companion catalogue from companions.json.
/// The file is read once and cached for the process lifetime.
/// </summary>
public class CompanionService : ICompanionService
{
    private readonly string _filePath;
    private List<Companion>? _cache;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public CompanionService(IConfiguration configuration)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "static", "companions.json");
    }

    public async Task<List<Companion>> GetAllAsync()
    {
        if (_cache is not null) return _cache;

        await _lock.WaitAsync();
        try
        {
            if (_cache is not null) return _cache;

            List<Companion> companions;
            try
            {
                var raw = await File.ReadAllTextAsync(_filePath);
                companions = JsonSerializer.Deserialize<List<Companion>>(raw, JsonDefaults.Options) ?? new();
            }
            catch
            {
                companions = new();
            }

            _cache = companions;
            return _cache;
        }
        finally
        {
            _lock.Release();
        }
    }
}
