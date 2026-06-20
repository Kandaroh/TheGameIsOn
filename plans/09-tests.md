# Phase 9 — Tests

## Goal
Port `test/spawn-test.ts` to an xUnit test class and add a few integration smoke tests to ensure the C# backend is behaviourally identical to the TS one.

## Prompt Template
> Paste `spawn-test.ts` (~45 lines) + relevant C# interface signatures, then:

```
Convert this test to xUnit in TheGameIsOn.Tests.
Use FluentAssertions (add NuGet package) for readable assertions.
Register real service/repo implementations (not mocks) — these are
integration tests that read from the same static JSON files.
```

## Test 1 — `SpawnRuleTests.cs` (port of `spawn-test.ts`)

```csharp
public class SpawnRuleTests
{
    private readonly IEventSpawnerService _spawner;
    private readonly IEventRepository _eventRepo;

    public SpawnRuleTests()
    {
        // Build a mini DI container or construct manually with real repos
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DataRoot"] = "../../../../../backend/data"
            })
            .Build();

        _eventRepo = new EventRepository(config);
        _spawner = new EventSpawnerService(_eventRepo);
    }

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
                      .Should().BeLessOrEqualTo(max,
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
                  .Should().BeGreaterOrEqualTo(def.SpawnRules.Min,
                      $"{def.Type} should meet min {def.SpawnRules.Min}");
        }
    }

    private static List<NodeDefinition> MakeNodes(int count, Dictionary<string, int> preset) { /* ... */ }
}
```

## Test 2 — `GameLogicTests.cs` (new)

```csharp
[Fact]
public async Task CreateInitialState_Returns_Valid_State()
{
    var state = await _gameLogic.CreateInitialStateAsync();
    state.Player.Should().NotBeNull();
    state.Player.Position.Should().Be("start");
    state.Graph.Nodes.Should().HaveCountGreaterOrEqualTo(20);
    state.Cards.Should().HaveCount(6);
    state.Companions.Should().BeEmpty();
}

[Fact]
public void MovePlayer_Valid_Edge_Updates_Position()
{
    // Build a state with known edges, call MovePlayer, assert position changed.
}

[Fact]
public void MovePlayer_Invalid_Edge_Appends_History_Error()
{
    // Attempt a move with no matching edge, assert history contains "invalid move".
}
```

## Test 3 — `DeckServiceTests.cs` (new)

```csharp
[Fact]
public void DrawCards_Reshuffles_Discard_When_Deck_Empty()
{
    // State with empty deck, 3 cards in discard, draw 2.
    // Assert hand has 2 cards, deck has 1, discard is empty.
}

[Fact]
public void Shuffle_Returns_Same_Elements()
{
    var input = new List<string> { "a", "b", "c", "d" };
    var output = _deckService.Shuffle(input);
    output.Should().BeEquivalentTo(input);
}
```

## Test 4 — `LevelingServiceTests.cs` (new)

```csharp
[Fact]
public void ProcessLevelUps_Levels_Up_When_Exp_Sufficient()
{
    // Companion at level 1 with 100 exp → should become level 2 with 0 exp.
}

[Fact]
public void ProcessLevelUps_Carries_Over_Excess_Exp()
{
    // Companion at level 1 with 250 exp → level 3 with 50 exp.
}
```

## NuGet Packages for Test Project

```powershell
cd TheGameIsOn.Tests
dotnet add package FluentAssertions
dotnet add package Microsoft.Extensions.Configuration
dotnet add package Microsoft.Extensions.Configuration.Memory
```

## Validation

```powershell
cd backend-csharp
dotnet test
```

All tests green.

---

## Final Acceptance Criteria

After Phase 9, the C# backend must:

1. **Start** on `http://localhost:4000`.
2. **Respond** to every endpoint in the route table with identical JSON shapes.
3. **Read/write** the same `data/` folder as the TS backend.
4. **Pass** all xUnit tests.
5. **Work** with the existing Angular frontend at `http://localhost:4200` with zero frontend changes.
