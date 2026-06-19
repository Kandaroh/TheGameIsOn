using System.Text.Json;
using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface IGameLogicService
{
    Task<GameState> CreateInitialStateAsync();
    GameState MovePlayer(GameState state, string nextNodeId);
    GameState PlayCard(GameState state, string cardId);
}

public class GameLogicService : IGameLogicService
{
    private readonly IMapGeneratorService _mapGenerator;
    private readonly IEventSpawnerService _eventSpawner;

    public GameLogicService(IMapGeneratorService mapGenerator, IEventSpawnerService eventSpawner)
    {
        _mapGenerator = mapGenerator;
        _eventSpawner = eventSpawner;
    }

    public async Task<GameState> CreateInitialStateAsync()
    {
        var cards = new List<Card>
        {
            new()
            {
                Id = "strike", Name = "Strike", Cost = 1, Type = CardType.Attack, Element = CardElement.Neutral,
                Properties = JsonProperties(("damage", 3)),
                EffectId = "fx-strike-normal", EnhancedEffectId = "fx-strike-enhanced",
                Effect = new CardEffectRef("Deal 3 damage to one enemy."),
                EnhancedEffect = new CardEffectRef("Deal 5 damage to one enemy.")
            },
            new()
            {
                Id = "shield", Name = "Shield", Cost = 1, Type = CardType.Defense, Element = CardElement.Neutral,
                Properties = JsonProperties(("block", 3)),
                EffectId = "fx-shield-normal", EnhancedEffectId = "fx-shield-enhanced",
                Effect = new CardEffectRef("Gain 2 shield."),
                EnhancedEffect = new CardEffectRef("Gain 4 shield.")
            },
            new()
            {
                Id = "focus", Name = "Focus", Cost = 2, Type = CardType.Utility, Element = CardElement.Neutral,
                Properties = JsonProperties(("manaGain", 2))
            },
            new()
            {
                Id = "bash", Name = "Bash", Cost = 2, Type = CardType.Attack, Element = CardElement.Neutral,
                Properties = JsonProperties(("damage", 5)),
                EffectId = "fx-strike-enhanced", EnhancedEffectId = "fx-comp-strike-enhanced",
                Effect = new CardEffectRef("Deal 5 damage to one enemy."),
                EnhancedEffect = new CardEffectRef("Deal 6 damage to one enemy.")
            },
            new()
            {
                Id = "heal", Name = "Heal", Cost = 1, Type = CardType.Defense, Element = CardElement.Neutral,
                Properties = JsonProperties(("recover", 2))
            },
            new()
            {
                Id = "charge", Name = "Charge", Cost = 1, Type = CardType.Utility, Element = CardElement.Neutral,
                Properties = JsonProperties(("speed", 1))
            }
        };

        var graph = _mapGenerator.Generate(new MapGenerationOptions
        {
            MinNodes = 20, MaxNodes = 24, MinLayers = 5, MaxLayers = 7
        });

        var nodes = await _eventSpawner.AssignEventsAsync(graph.Nodes);
        graph = graph with { Nodes = nodes };

        var deck = new Deck { CardIds = cards.Select(c => c.Id).ToList() };

        return new GameState
        {
            Player = new Player
            {
                Id = "player-1",
                Life = 20,
                Mana = 3,
                Gold = 0,
                Deck = deck,
                Hand = new List<string> { "strike", "shield", "focus" },
                Discard = new(),
                Position = "start",
                EncounterCount = 0
            },
            Graph = graph,
            Cards = cards,
            Companions = new(),
            History = new List<string> { "New run created" }
        };
    }

    public GameState MovePlayer(GameState state, string nextNodeId)
    {
        var isForwardMove = state.Graph.Edges.Any(e => e.From == state.Player.Position && e.To == nextNodeId);
        if (!isForwardMove)
        {
            return new GameState
            {
                Player = state.Player,
                Graph = state.Graph,
                Cards = state.Cards,
                Companions = state.Companions,
                History = new List<string>(state.History) { $"invalid move attempted to {nextNodeId}" },
                Battle = state.Battle,
                PendingAbilityChoices = state.PendingAbilityChoices
            };
        }

        return new GameState
        {
            Player = state.Player with { Position = nextNodeId },
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = new List<string>(state.History) { $"moved to {nextNodeId}" },
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    public GameState PlayCard(GameState state, string cardId)
    {
        var card = state.Cards.FirstOrDefault(c => c.Id == cardId);
        if (card is null || !state.Player.Hand.Contains(cardId) || card.Cost > state.Player.Mana)
        {
            return new GameState
            {
                Player = state.Player,
                Graph = state.Graph,
                Cards = state.Cards,
                Companions = state.Companions,
                History = new List<string>(state.History) { $"could not play {cardId}" },
                Battle = state.Battle,
                PendingAbilityChoices = state.PendingAbilityChoices
            };
        }

        var remainingHand = state.Player.Hand.Where(id => id != cardId).ToList();
        var discard = new List<string>(state.Player.Discard) { cardId };

        return new GameState
        {
            Player = state.Player with
            {
                Mana = state.Player.Mana - card.Cost,
                Hand = remainingHand,
                Discard = discard
            },
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = new List<string>(state.History) { $"played {card.Name}" },
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    // -------------------------------------------------------------------------
    // Helper
    // -------------------------------------------------------------------------

    private static Dictionary<string, JsonElement> JsonProperties(params (string Key, int Value)[] pairs)
    {
        var dict = new Dictionary<string, JsonElement>();
        foreach (var (key, value) in pairs)
            dict[key] = JsonSerializer.SerializeToElement(value);
        return dict;
    }
}
