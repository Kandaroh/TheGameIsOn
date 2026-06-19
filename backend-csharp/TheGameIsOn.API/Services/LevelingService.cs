using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

/// <summary>
/// Centralises all companion leveling logic.
/// EXP threshold formula: nextLevelExp = level * 100
/// </summary>
public class LevelingService : ILevelingService
{
    private const int HpPerLevel = 3;
    private const int EnergyLevelInterval = 3;

    /// <summary>EXP required to reach the next level.</summary>
    public int ExpThreshold(int level) => level * 100;

    /// <summary>
    /// Stamp <c>nextLevelExp</c> on a companion so the frontend can render
    /// the progress bar without knowing the formula.
    /// </summary>
    public Companion WithNextLevelExp(Companion companion)
    {
        var c = CardEffectService.CloneCompanion(companion);
        c.NextLevelExp = ExpThreshold(c.Level);
        return c;
    }

    /// <summary>
    /// Process any pending level-ups for a single companion.
    /// May loop more than once if enough EXP was awarded to skip multiple levels.
    /// Returns a new companion object (no mutation) with updated stats.
    /// </summary>
    public (Companion Companion, List<PendingAbilityChoice> NewChoices) ProcessLevelUps(Companion companion)
    {
        var c = CardEffectService.CloneCompanion(companion);
        var newChoices = new List<PendingAbilityChoice>();
        var threshold = ExpThreshold(c.Level);

        while (c.Exp >= threshold)
        {
            c.Exp   -= threshold;
            c.Level += 1;

            // Stat boosts
            var newMaxLife = (c.MaxLife ?? c.Life) + HpPerLevel;
            c.MaxLife = newMaxLife;
            c.Life = Math.Min(c.Life + HpPerLevel, newMaxLife);

            if (c.Level % EnergyLevelInterval == 0)
            {
                var newMaxEnergy = (c.MaxEnergy ?? c.Energy) + 1;
                c.MaxEnergy = newMaxEnergy;
            }

            threshold = ExpThreshold(c.Level);
        }

        // Always stamp the current threshold
        c.NextLevelExp = threshold;

        // Check each unlock level for pending ability choices
        var unlockLevels = c.AbilityUnlockLevels;
        for (var i = 0; i < unlockLevels.Count; i++)
        {
            if (c.Level >= unlockLevels[i] && c.SpecialAbilities.Count <= i)
            {
                var chosenIds = new HashSet<string>(c.SpecialAbilities.Select(a => a.Id));
                var remaining = c.AbilityPool.Where(a => !chosenIds.Contains(a.Id)).ToList();
                var options = PickRandom(remaining, 3);
                if (options.Count > 0)
                {
                    newChoices.Add(new PendingAbilityChoice
                    {
                        CompanionId   = c.Id,
                        CompanionName = c.Name,
                        UnlockIndex   = i,
                        Options       = options
                    });
                }
            }
        }

        return (c, newChoices);
    }

    /// <summary>Convenience: process level-ups for every companion in the list.</summary>
    public (List<Companion> Companions, List<PendingAbilityChoice> AllChoices) ProcessAll(List<Companion> companions)
    {
        var allChoices = new List<PendingAbilityChoice>();
        var result = new List<Companion>();

        foreach (var comp in companions)
        {
            var (leveled, choices) = ProcessLevelUps(comp);
            allChoices.AddRange(choices);
            result.Add(leveled);
        }

        return (result, allChoices);
    }

    /// <summary>Pick up to <paramref name="count"/> random elements (Fisher-Yates sample).</summary>
    private static List<T> PickRandom<T>(List<T> arr, int count)
    {
        var pool = new List<T>(arr);
        var result = new List<T>();
        while (result.Count < count && pool.Count > 0)
        {
            var i = Random.Shared.Next(pool.Count);
            result.Add(pool[i]);
            pool.RemoveAt(i);
        }
        return result;
    }
}
