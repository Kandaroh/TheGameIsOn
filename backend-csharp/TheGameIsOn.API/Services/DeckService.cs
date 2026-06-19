using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface IDeckService
{
    List<T> Shuffle<T>(List<T> list);
    GameState DrawCards(GameState state, int count);
    (Deck Deck, List<Card> Cards) BuildStartingDeck(List<Card> baseCards, List<Companion> companions);
}

/// <summary>
/// Pure deck-management service.
/// All methods are stateless: they accept a GameState and return a new one
/// (or return plain data structures). No file I/O; no side effects.
/// </summary>
public class DeckService : IDeckService
{
    /// <summary>Fisher-Yates shuffle. Returns a new list; never mutates the input.</summary>
    public List<T> Shuffle<T>(List<T> list)
    {
        var a = new List<T>(list);
        for (var i = a.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (a[i], a[j]) = (a[j], a[i]);
        }
        return a;
    }

    /// <summary>
    /// Draw <paramref name="count"/> cards from the deck into the hand.
    /// If the deck is exhausted mid-draw the discard pile is shuffled back in
    /// automatically before continuing. If both are empty the draw stops early.
    /// Returns a new GameState with updated hand / deck / discard.
    /// </summary>
    public GameState DrawCards(GameState state, int count)
    {
        var deck    = new List<string>(state.Player.Deck.CardIds);
        var hand    = new List<string>(state.Player.Hand);
        var discard = new List<string>(state.Player.Discard);

        for (var i = 0; i < count; i++)
        {
            if (deck.Count == 0)
            {
                if (discard.Count == 0) break;
                deck = Shuffle(discard);
                discard = new List<string>();
            }

            hand.Add(deck[0]);
            deck.RemoveAt(0);
        }

        return new GameState
        {
            Player = state.Player with
            {
                Hand = hand,
                Deck = state.Player.Deck with { CardIds = deck },
                Discard = discard
            },
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = state.History,
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    /// <summary>
    /// Build the master card catalogue and starting deck for a new run.
    /// Combines <paramref name="baseCards"/> with two companion-specific
    /// starter cards per companion.
    /// </summary>
    public (Deck Deck, List<Card> Cards) BuildStartingDeck(List<Card> baseCards, List<Companion> companions)
    {
        var cards = new List<Card>(baseCards);

        for (var idx = 0; idx < companions.Count; idx++)
        {
            var companion = companions[idx];
            var companionElement = companion.Element ?? CardElement.Neutral;

            // Attack-type starter card — inherits the companion's element
            cards.Add(new Card
            {
                Id               = $"comp-{companion.Id}-{idx}-a",
                Name             = $"{companion.Name} Strike",
                Cost             = 1,
                Type             = companion.Type,
                Element          = companionElement,
                Description      = "Companion basic attack",
                EffectId         = "fx-comp-strike-normal",
                EnhancedEffectId = "fx-comp-strike-enhanced",
                Effect           = new CardEffectRef("Deal 4 damage to one enemy."),
                EnhancedEffect   = new CardEffectRef("Deal 6 damage to one enemy.")
            });

            // Defence starter card — inherits the companion's element
            cards.Add(new Card
            {
                Id               = $"comp-{companion.Id}-{idx}-b",
                Name             = $"{companion.Name} Guard",
                Cost             = 1,
                Type             = CardType.Defense,
                Element          = companionElement,
                Description      = "Companion basic defence",
                EffectId         = "fx-comp-guard-normal",
                EnhancedEffectId = "fx-comp-guard-enhanced",
                Effect           = new CardEffectRef("Gain 3 shield."),
                EnhancedEffect   = new CardEffectRef("Gain 5 shield.")
            });
        }

        var deck = new Deck { CardIds = cards.Select(c => c.Id).ToList() };
        return (deck, cards);
    }
}
