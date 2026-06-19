using System.Text.Json;
using TheGameIsOn.API.Helpers;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface IPersistenceService
{
    Task<GameState> LoadStateAsync();
    Task SaveStateAsync(GameState state);
}

public class PersistenceService : IPersistenceService
{
    private readonly string _filePath;
    private readonly IGameLogicService _gameLogic;

    public PersistenceService(IConfiguration configuration, IGameLogicService gameLogic)
    {
        var root = configuration["DataRoot"] ?? "data";
        _filePath = Path.Combine(root, "saves", "game-state.json");
        _gameLogic = gameLogic;
    }

    public async Task<GameState> LoadStateAsync()
    {
        try
        {
            var raw = await File.ReadAllTextAsync(_filePath);
            return JsonSerializer.Deserialize<GameState>(raw, JsonDefaults.Options) ?? await DefaultState();
        }
        catch
        {
            return await DefaultState();
        }
    }

    public async Task SaveStateAsync(GameState state)
    {
        var payload = JsonSerializer.Serialize(state, JsonDefaults.Options);
        var dir = Path.GetDirectoryName(_filePath);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);
        await File.WriteAllTextAsync(_filePath, payload);
    }

    private Task<GameState> DefaultState() => _gameLogic.CreateInitialStateAsync();
}
