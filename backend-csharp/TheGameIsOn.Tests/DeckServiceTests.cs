using FluentAssertions;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.Tests;

public class DeckServiceTests
{
    private readonly IDeckService _deckService = TestHelpers.DeckService();

    [Fact]
    public void Shuffle_Returns_Same_Elements()
    {
        var input = new List<string> { "a", "b", "c", "d", "e" };
        var output = _deckService.Shuffle(input);

        output.Should().BeEquivalentTo(input);
        // original should be unchanged
        input.Should().ContainInOrder("a", "b", "c", "d", "e");
    }

    [Fact]
    public void DrawCards_Moves_Cards_From_Deck_To_Hand()
    {
        var state = new GameState
        {
            Player = new Player
            {
                Id = "p1",
                Deck = new Deck { CardIds = new List<string> { "c1", "c2", "c3" } },
                Hand = new(),
                Discard = new()
            }
        };

        var updated = _deckService.DrawCards(state, 2);

        updated.Player.Hand.Should().HaveCount(2);
        updated.Player.Deck.CardIds.Should().HaveCount(1);
    }

    [Fact]
    public void DrawCards_Reshuffles_Discard_When_Deck_Empty()
    {
        var state = new GameState
        {
            Player = new Player
            {
                Id = "p1",
                Deck = new Deck { CardIds = new() },
                Hand = new(),
                Discard = new List<string> { "c1", "c2", "c3" }
            }
        };

        var updated = _deckService.DrawCards(state, 2);

        updated.Player.Hand.Should().HaveCount(2);
        updated.Player.Deck.CardIds.Should().HaveCount(1);
        updated.Player.Discard.Should().BeEmpty();
    }

    [Fact]
    public void DrawCards_Stops_When_Both_Deck_And_Discard_Empty()
    {
        var state = new GameState
        {
            Player = new Player
            {
                Id = "p1",
                Deck = new Deck { CardIds = new List<string> { "c1" } },
                Hand = new(),
                Discard = new()
            }
        };

        var updated = _deckService.DrawCards(state, 5);

        updated.Player.Hand.Should().HaveCount(1);
        updated.Player.Deck.CardIds.Should().BeEmpty();
    }

    [Fact]
    public void BuildStartingDeck_Adds_Companion_Cards()
    {
        var baseCards = new List<Card>
        {
            new() { Id = "strike", Name = "Strike", Cost = 1, Type = CardType.Attack }
        };

        var companions = new List<Companion>
        {
            new() { Id = "wyvern", Name = "Wyvern", Type = CardType.Attack, Element = CardElement.Fire }
        };

        var (deck, cards) = _deckService.BuildStartingDeck(baseCards, companions);

        // 1 base card + 2 per companion = 3
        cards.Should().HaveCount(3);
        deck.CardIds.Should().HaveCount(3);
        cards.Should().Contain(c => c.Id.Contains("comp-wyvern") && c.Name.Contains("Strike"));
        cards.Should().Contain(c => c.Id.Contains("comp-wyvern") && c.Name.Contains("Guard"));
    }
}
