using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.API.Repositories;

public interface IStateRepository
{
    Task<GameState> LoadAsync();
    Task SaveAsync(GameState state);
}

public class StateRepository : IStateRepository
{
    private readonly string _filePath;
    private readonly ILevelingService _leveling;

    public StateRepository(IConfiguration configuration, ILevelingService leveling)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "saves", "game-state.json");
        _leveling = leveling;
    }

    public async Task<GameState> LoadAsync()
    {
        GameState state;
        try
        {
            var raw = await File.ReadAllTextAsync(_filePath);
            state = JsonSerializer.Deserialize<GameState>(raw, JsonDefaults.Options)
                    ?? new GameState();
        }
        catch
        {
            // File missing or malformed — return a default empty state.
            // The full default state creation will be handled by GameLogicService (Phase 6).
            state = new GameState();
        }

        // Migration guard: older persisted states lack encounterCount.
        // Since C# int defaults to 0 on deserialisation, this is already handled.

        // Migration guard: stamp nextLevelExp on companions that predate the field.
        if (state.Companions.Count > 0)
        {
            for (var i = 0; i < state.Companions.Count; i++)
            {
                if (state.Companions[i].NextLevelExp is null)
                {
                    state.Companions[i] = _leveling.WithNextLevelExp(state.Companions[i]);
                }
            }
        }

        return state;
    }

    public async Task SaveAsync(GameState state)
    {
        var payload = JsonSerializer.Serialize(state, JsonDefaults.Options);
        var dir = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        await File.WriteAllTextAsync(_filePath, payload);
    }
}
