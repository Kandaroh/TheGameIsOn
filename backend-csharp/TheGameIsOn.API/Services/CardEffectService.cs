using TheGameIsOn.API.Models;

namespace TheGameIsOn.API.Services;

public interface ICardEffectService
{
    GameState Apply(CardEffect effect, IEffectEntity source, List<IEffectEntity> targets, GameState state);
}

/// <summary>
/// Single-responsibility service for applying CardEffects to game state.
/// All methods return a new GameState — no in-place mutations.
/// </summary>
public class CardEffectService : ICardEffectService
{
    public GameState Apply(CardEffect effect, IEffectEntity source, List<IEffectEntity> targets, GameState state)
    {
        return effect.Action switch
        {
            CardEffectAction.Damage => ApplyDamage(effect.Value, source, targets, state),
            CardEffectAction.Shield => ApplyShield(effect.Value, source, state),
            CardEffectAction.Heal   => ApplyHeal(effect.Value, source, state),
            // ApplyStatus is handled async by StatusEffectService in BattleService
            _ => state
        };
    }

    // -------------------------------------------------------------------------

    private GameState ApplyDamage(int value, IEffectEntity source, List<IEffectEntity> targets, GameState state)
    {
        var targetIds = new HashSet<string>(targets.Select(t => t.Id));
        var isCompanionSource = source is Companion;

        var updatedEnemies = (state.Battle?.Enemies ?? new()).Select(enemy =>
        {
            if (!targetIds.Contains(enemy.Id)) return enemy;

            var dmgThrough = Math.Max(0, value - enemy.Shield);
            var newShield  = Math.Max(0, enemy.Shield - value);
            var newLife    = Math.Max(0, enemy.Life - dmgThrough);

            return new BattleEnemy
            {
                Id                  = enemy.Id,
                DefinitionId        = enemy.DefinitionId,
                Name                = enemy.Name,
                Life                = newLife,
                MaxLife             = enemy.MaxLife,
                Shield              = newShield,
                Energy              = enemy.Energy,
                MaxEnergy           = enemy.MaxEnergy,
                Element             = enemy.Element,
                Type                = enemy.Type,
                Level               = enemy.Level,
                ExpReward           = enemy.ExpReward,
                Rewards             = enemy.Rewards,
                AttackSummaries     = enemy.AttackSummaries,
                KilledByCompanionId = newLife == 0 && enemy.KilledByCompanionId is null && isCompanionSource
                    ? source.Id
                    : enemy.KilledByCompanionId,
                StatusEffects       = enemy.StatusEffects
            };
        }).ToList();

        var updatedCompanions = state.Companions.Select(companion =>
        {
            if (!targetIds.Contains(companion.Id)) return companion;

            var currentShield = companion.Shield;
            var dmgThrough    = Math.Max(0, value - currentShield);
            var newShield     = Math.Max(0, currentShield - value);
            var newLife       = Math.Max(0, companion.Life - dmgThrough);

            return CloneCompanion(companion, c =>
            {
                c.Life   = newLife;
                c.Shield = newShield;
            });
        }).ToList();

        return new GameState
        {
            Player                = state.Player,
            Graph                 = state.Graph,
            Cards                 = state.Cards,
            Companions            = updatedCompanions,
            History               = state.History,
            Battle                = state.Battle is not null
                ? CloneBattle(state.Battle, b => b.Enemies = updatedEnemies)
                : null,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    private GameState ApplyShield(int value, IEffectEntity source, GameState state)
    {
        var updatedCompanions = state.Companions.Select(c =>
            c.Id != source.Id
                ? c
                : CloneCompanion(c, comp => comp.Shield += value)
        ).ToList();

        return new GameState
        {
            Player                = state.Player,
            Graph                 = state.Graph,
            Cards                 = state.Cards,
            Companions            = updatedCompanions,
            History               = state.History,
            Battle                = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    private GameState ApplyHeal(int value, IEffectEntity source, GameState state)
    {
        var updatedCompanions = state.Companions.Select(c =>
        {
            if (c.Id != source.Id) return c;
            var max = c.MaxLife ?? c.Life;
            return CloneCompanion(c, comp => comp.Life = Math.Min(max, c.Life + value));
        }).ToList();

        return new GameState
        {
            Player                = state.Player,
            Graph                 = state.Graph,
            Cards                 = state.Cards,
            Companions            = updatedCompanions,
            History               = state.History,
            Battle                = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    // -------------------------------------------------------------------------
    // Shallow-clone helpers
    // -------------------------------------------------------------------------

    internal static Companion CloneCompanion(Companion src, Action<Companion>? mutate = null)
    {
        var c = new Companion
        {
            Id                 = src.Id,
            Name               = src.Name,
            Type               = src.Type,
            Element            = src.Element,
            Life               = src.Life,
            MaxLife            = src.MaxLife,
            Energy             = src.Energy,
            MaxEnergy          = src.MaxEnergy,
            EnergyRefill       = src.EnergyRefill,
            Sprite             = src.Sprite,
            PriceDecks         = src.PriceDecks,
            Level              = src.Level,
            Exp                = src.Exp,
            NextLevelExp       = src.NextLevelExp,
            AbilityUnlockLevels= new List<int>(src.AbilityUnlockLevels),
            AbilityPool        = new List<SpecialAbility>(src.AbilityPool),
            SpecialAbilities   = new List<SpecialAbility>(src.SpecialAbilities),
            Shield             = src.Shield,
            StatusEffects      = src.StatusEffects is not null ? new List<StatusEffect>(src.StatusEffects) : null
        };
        mutate?.Invoke(c);
        return c;
    }

    private static BattleState CloneBattle(BattleState src, Action<BattleState>? mutate = null)
    {
        var b = new BattleState
        {
            Active             = src.Active,
            Enemies            = new List<BattleEnemy>(src.Enemies),
            Turn               = src.Turn,
            Log                = new List<string>(src.Log),
            PendingCardRewards = new List<PendingCardReward>(src.PendingCardRewards),
            LastTurnActions    = src.LastTurnActions is not null ? new List<EnemyTurnAction>(src.LastTurnActions) : null
        };
        mutate?.Invoke(b);
        return b;
    }
}
