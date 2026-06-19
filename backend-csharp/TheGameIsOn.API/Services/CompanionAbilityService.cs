using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface ICompanionAbilityService
{
    (CardEffect Effect, List<string> Logs) ApplyPassiveModifiers(
        CardEffect effect, Card card, Companion companion, List<IEffectEntity> targets, GameState state);

    (List<CardEffect> Effects, List<string> Logs) GetPostPlayEffects(
        Card card, Companion companion, GameState state);

    (int Discount, List<string> Logs) GetCostReduction(
        Card card, Companion companion, GameState state);

    int GetRetaliationDamage(Companion companion);
}

/// <summary>
/// Evaluates a companion's passive abilities and modifies card effects, costs,
/// or produces bonus effects accordingly.
/// </summary>
public class CompanionAbilityService : ICompanionAbilityService
{
    /// <summary>
    /// Pre-process a card effect based on the playing companion's passive abilities.
    /// Returns a modified CardEffect (or the original if no modifiers apply) plus log entries.
    /// </summary>
    public (CardEffect Effect, List<string> Logs) ApplyPassiveModifiers(
        CardEffect effect, Card card, Companion companion, List<IEffectEntity> targets, GameState state)
    {
        var modified = effect;
        var logs = new List<string>();

        foreach (var ability in companion.SpecialAbilities ?? new())
        {
            if (ability.Trigger != SpecialAbilityTrigger.Passive || ability.Modifier is null) continue;

            var mod = ability.Modifier;

            if ((mod.Type == PassiveModifierType.BonusDamage || mod.Type == PassiveModifierType.ConditionalBonus)
                && modified.Action == CardEffectAction.Damage)
            {
                if (!CheckCondition(mod, card, companion, targets, state)) continue;

                modified = modified with { Value = modified.Value + mod.Value };
                logs.Add($"  ⚡ {companion.Name} passive \"{ability.Name}\": +{mod.Value} damage (total {modified.Value})");
            }
        }

        return (modified, logs);
    }

    /// <summary>
    /// Collect any post-card-play bonus effects (e.g. bonus shield on attack or defense play).
    /// </summary>
    public (List<CardEffect> Effects, List<string> Logs) GetPostPlayEffects(
        Card card, Companion companion, GameState state)
    {
        var extras = new List<CardEffect>();
        var logs = new List<string>();

        foreach (var ability in companion.SpecialAbilities ?? new())
        {
            if (ability.Trigger != SpecialAbilityTrigger.Passive || ability.Modifier is null) continue;
            if (ability.Modifier.Type != PassiveModifierType.BonusShield) continue;
            if (!CheckCondition(ability.Modifier, card, companion, new(), state)) continue;

            extras.Add(new CardEffect
            {
                Id          = $"{ability.Id}-bonus",
                Description = ability.Description,
                Action      = CardEffectAction.Shield,
                Value       = ability.Modifier.Value,
                Target      = CardEffectTarget.Companion
            });
            logs.Add($"  ⚡ {companion.Name} passive \"{ability.Name}\": +{ability.Modifier.Value} shield");
        }

        return (extras, logs);
    }

    /// <summary>
    /// Check cost reduction modifiers. Returns total energy discount.
    /// </summary>
    public (int Discount, List<string> Logs) GetCostReduction(
        Card card, Companion companion, GameState state)
    {
        var discount = 0;
        var logs = new List<string>();

        foreach (var ability in companion.SpecialAbilities ?? new())
        {
            if (ability.Trigger != SpecialAbilityTrigger.Passive || ability.Modifier is null) continue;
            if (ability.Modifier.Type != PassiveModifierType.CostReduction) continue;
            if (!CheckCondition(ability.Modifier, card, companion, new(), state)) continue;

            discount += ability.Modifier.Value;
            logs.Add($"  ⚡ {companion.Name} passive \"{ability.Name}\": -{ability.Modifier.Value} energy cost");
        }

        return (discount, logs);
    }

    /// <summary>
    /// Get retaliation damage for enemy-turn processing.
    /// </summary>
    public int GetRetaliationDamage(Companion companion)
    {
        var total = 0;
        foreach (var ability in companion.SpecialAbilities ?? new())
        {
            if (ability.Trigger != SpecialAbilityTrigger.Passive || ability.Modifier is null) continue;
            if (ability.Modifier.Type != PassiveModifierType.Retaliation) continue;
            total += ability.Modifier.Value;
        }
        return total;
    }

    // -------------------------------------------------------------------------
    // Private
    // -------------------------------------------------------------------------

    private static bool CheckCondition(
        PassiveModifier modifier, Card card, Companion companion,
        List<IEffectEntity> targets, GameState state)
    {
        if (modifier.Condition is null) return true;

        var cond = modifier.Condition;
        object? actual = cond.Field switch
        {
            "card.type"    => card.Type.ToString().ToLowerInvariant(),
            "card.element" => card.Element?.ToString()?.ToLowerInvariant(),
            _              => null // unknown field = treat as unconditional
        };

        if (actual is null) return true;

        // Determine the value to compare against
        var compareValue = cond.Value.StringValue ?? cond.Value.NumberValue?.ToString() ?? "";
        var actualStr = actual.ToString() ?? "";

        return cond.Op switch
        {
            ComparisonOp.Eq  => string.Equals(actualStr, compareValue, StringComparison.OrdinalIgnoreCase),
            ComparisonOp.Neq => !string.Equals(actualStr, compareValue, StringComparison.OrdinalIgnoreCase),
            ComparisonOp.Lt  => double.TryParse(actualStr, out var a) && double.TryParse(compareValue, out var b) && a < b,
            ComparisonOp.Gt  => double.TryParse(actualStr, out var a2) && double.TryParse(compareValue, out var b2) && a2 > b2,
            ComparisonOp.Lte => double.TryParse(actualStr, out var a3) && double.TryParse(compareValue, out var b3) && a3 <= b3,
            ComparisonOp.Gte => double.TryParse(actualStr, out var a4) && double.TryParse(compareValue, out var b4) && a4 >= b4,
            _                => true
        };
    }
}
