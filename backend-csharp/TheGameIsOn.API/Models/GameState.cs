namespace TheGameIsOn.API.Models;

public record PendingAbilityChoice
{
    public string CompanionId { get; init; } = string.Empty;
    public string CompanionName { get; init; } = string.Empty;
    /// <summary>The unlock slot index (0, 1, or 2) being filled.</summary>
    public int UnlockIndex { get; init; }
    /// <summary>3 abilities randomly drawn from the companion's abilityPool (minus already chosen).</summary>
    public List<SpecialAbility> Options { get; init; } = new();
}

/// <summary>Mutable — the top-level game state evolves throughout a session.</summary>
public class GameState
{
    public Player Player { get; set; } = new();
    public Graph Graph { get; set; } = new();
    public List<Card> Cards { get; set; } = new();
    public List<Companion> Companions { get; set; } = new();
    public List<string> History { get; set; } = new();
    /// <summary>Present and active while the player is inside a battle encounter.</summary>
    public BattleState? Battle { get; set; }
    /// <summary>Pending ability choices the player must resolve before continuing.</summary>
    public List<PendingAbilityChoice>? PendingAbilityChoices { get; set; }
}
