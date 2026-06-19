using TheGameIsOn.API.Models;
using TheGameIsOn.API.Repositories;

namespace TheGameIsOn.API.Services;

public interface IStatusEffectService
{
    Task<GameState> ApplyStatus(List<IEffectEntity> targets, string statusId, int stacks, GameState state);
    Task<(GameState State, List<EnemyTurnAction> Actions)> TickStatuses(StatusTriggerMoment moment, GameState state);
    GameState RemoveStatus(string targetId, string statusId, string kind, GameState state);
}

/// <summary>
/// Manages the lifecycle of status effects on companions and enemies.
/// </summary>
public class StatusEffectService : IStatusEffectService
{
    private readonly ICardEffectService _effectService;
    private readonly ICardEffectRepository _effectRepo;
    private readonly IStatusRepository _statusRepo;

    public StatusEffectService(
        ICardEffectService effectService,
        ICardEffectRepository effectRepo,
        IStatusRepository statusRepo)
    {
        _effectService = effectService;
        _effectRepo = effectRepo;
        _statusRepo = statusRepo;
    }

    // -------------------------------------------------------------------------
    // Apply
    // -------------------------------------------------------------------------

    public async Task<GameState> ApplyStatus(
        List<IEffectEntity> targets, string statusId, int stacks, GameState state)
    {
        var def = await _statusRepo.GetByIdAsync(statusId);
        if (def is null) return state;

        var targetIds = new HashSet<string>(targets.Select(t => t.Id));

        var updatedCompanions = state.Companions.Select(c =>
            !targetIds.Contains(c.Id) ? c : UpsertStatus(c, def, stacks)
        ).ToList();

        var updatedEnemies = (state.Battle?.Enemies ?? new()).Select(e =>
            !targetIds.Contains(e.Id) ? e : UpsertStatusEnemy(e, def, stacks)
        ).ToList();

        return new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = updatedCompanions,
            History = state.History,
            Battle = state.Battle is not null
                ? CloneBattle(state.Battle, b => b.Enemies = updatedEnemies)
                : null,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    // -------------------------------------------------------------------------
    // Tick
    // -------------------------------------------------------------------------

    public async Task<(GameState State, List<EnemyTurnAction> Actions)> TickStatuses(
        StatusTriggerMoment moment, GameState state)
    {
        var actions = new List<EnemyTurnAction>();
        var workingState = state;

        // --- Tick companions ---
        foreach (var companion in workingState.Companions.ToList())
        {
            if (companion.Life <= 0) continue;
            var statuses = companion.StatusEffects ?? new();
            var matching = statuses.Where(s => s.TriggerMoment == moment).ToList();
            if (matching.Count == 0) continue;

            foreach (var status in matching)
            {
                var def = await _statusRepo.GetByIdAsync(status.Id);
                if (def is null) continue;

                var tickEffect = await _effectRepo.GetByIdAsync(def.TickEffectId);
                if (tickEffect is null) continue;

                var resolvedEffect = tickEffect with { Value = status.Stacks };

                var currentComp = FindCompanion(workingState, companion.Id);
                if (currentComp is null) continue;
                var hpBefore = currentComp.Life;

                workingState = _effectService.Apply(
                    resolvedEffect, currentComp, new List<IEffectEntity> { currentComp }, workingState);

                var hpAfter = FindCompanion(workingState, companion.Id)?.Life ?? 0;
                var dmg = hpBefore - hpAfter;
                var killed = hpAfter <= 0;

                if (dmg > 0 || killed)
                {
                    actions.Add(new EnemyTurnAction
                    {
                        EnemyId = $"status-{status.Id}",
                        EnemyName = status.Name,
                        AttackName = $"{status.Name} ({status.Stacks} stacks)",
                        TargetId = companion.Id,
                        TargetName = companion.Name,
                        DamageDealt = dmg,
                        KilledTarget = killed
                    });
                }

                workingState = DecayStatus(workingState, companion.Id, status.Id, def.DecayPerTick, "companion");
            }
        }

        // --- Tick enemies ---
        foreach (var enemy in (workingState.Battle?.Enemies ?? new()).ToList())
        {
            if (enemy.Life <= 0) continue;
            var statuses = enemy.StatusEffects ?? new();
            var matching = statuses.Where(s => s.TriggerMoment == moment).ToList();
            if (matching.Count == 0) continue;

            foreach (var status in matching)
            {
                var def = await _statusRepo.GetByIdAsync(status.Id);
                if (def is null) continue;

                var tickEffect = await _effectRepo.GetByIdAsync(def.TickEffectId);
                if (tickEffect is null) continue;

                var resolvedEffect = tickEffect with { Value = status.Stacks, Target = CardEffectTarget.WildMonster };

                var currentEnemy = FindEnemy(workingState, enemy.Id);
                if (currentEnemy is null) continue;
                var hpBefore = currentEnemy.Life;

                workingState = _effectService.Apply(
                    resolvedEffect, currentEnemy, new List<IEffectEntity> { currentEnemy }, workingState);

                var hpAfter = FindEnemy(workingState, enemy.Id)?.Life ?? 0;
                var dmg = hpBefore - hpAfter;

                if (dmg > 0)
                {
                    workingState = new GameState
                    {
                        Player = workingState.Player,
                        Graph = workingState.Graph,
                        Cards = workingState.Cards,
                        Companions = workingState.Companions,
                        History = workingState.History,
                        Battle = CloneBattle(workingState.Battle!, b =>
                            b.Log = new List<string>(b.Log)
                            {
                                $"{status.Name} deals {dmg} damage to {enemy.Name} ({status.Stacks} stacks)."
                            }),
                        PendingAbilityChoices = workingState.PendingAbilityChoices
                    };
                }

                workingState = DecayStatus(workingState, enemy.Id, status.Id, def.DecayPerTick, "enemy");
            }
        }

        return (workingState, actions);
    }

    // -------------------------------------------------------------------------
    // Remove
    // -------------------------------------------------------------------------

    public GameState RemoveStatus(string targetId, string statusId, string kind, GameState state)
    {
        if (kind == "companion")
        {
            return new GameState
            {
                Player = state.Player,
                Graph = state.Graph,
                Cards = state.Cards,
                Companions = state.Companions.Select(c =>
                    c.Id != targetId ? c : CardEffectService.CloneCompanion(c, comp =>
                        comp.StatusEffects = (comp.StatusEffects ?? new()).Where(s => s.Id != statusId).ToList())
                ).ToList(),
                History = state.History,
                Battle = state.Battle,
                PendingAbilityChoices = state.PendingAbilityChoices
            };
        }

        return new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = state.History,
            Battle = state.Battle is not null
                ? CloneBattle(state.Battle, b =>
                    b.Enemies = b.Enemies.Select(e =>
                        e.Id != targetId ? e : CloneBattleEnemy(e, be =>
                            be.StatusEffects = (be.StatusEffects ?? new()).Where(s => s.Id != statusId).ToList())
                    ).ToList())
                : null,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static Companion UpsertStatus(Companion target, StatusEffectDefinition def, int stacks)
    {
        var existing = (target.StatusEffects ?? new()).ToList();
        var idx = existing.FindIndex(s => s.Id == def.Id);

        if (idx >= 0)
        {
            existing[idx] = existing[idx] with { Stacks = existing[idx].Stacks + stacks };
        }
        else
        {
            existing.Add(new StatusEffect
            {
                Id = def.Id,
                Name = def.Name,
                Icon = def.Icon,
                Stacks = stacks,
                TurnsRemaining = null,
                TriggerMoment = def.TriggerMoment,
                EffectId = def.TickEffectId
            });
        }

        return CardEffectService.CloneCompanion(target, c => c.StatusEffects = existing);
    }

    private static BattleEnemy UpsertStatusEnemy(BattleEnemy target, StatusEffectDefinition def, int stacks)
    {
        var existing = (target.StatusEffects ?? new()).ToList();
        var idx = existing.FindIndex(s => s.Id == def.Id);

        if (idx >= 0)
        {
            existing[idx] = existing[idx] with { Stacks = existing[idx].Stacks + stacks };
        }
        else
        {
            existing.Add(new StatusEffect
            {
                Id = def.Id,
                Name = def.Name,
                Icon = def.Icon,
                Stacks = stacks,
                TurnsRemaining = null,
                TriggerMoment = def.TriggerMoment,
                EffectId = def.TickEffectId
            });
        }

        return CloneBattleEnemy(target, e => e.StatusEffects = existing);
    }

    private static GameState DecayStatus(
        GameState state, string targetId, string statusId, int decay, string kind)
    {
        List<StatusEffect> Updater(List<StatusEffect> statuses) =>
            statuses
                .Select(s =>
                {
                    if (s.Id != statusId) return s;
                    var newStacks = s.Stacks - decay;
                    var newTurns = s.TurnsRemaining.HasValue ? s.TurnsRemaining.Value - 1 : (int?)null;
                    return s with { Stacks = newStacks, TurnsRemaining = newTurns };
                })
                .Where(s => s.Stacks > 0 && (s.TurnsRemaining is null || s.TurnsRemaining > 0))
                .ToList();

        if (kind == "companion")
        {
            return new GameState
            {
                Player = state.Player,
                Graph = state.Graph,
                Cards = state.Cards,
                Companions = state.Companions.Select(c =>
                    c.Id != targetId ? c : CardEffectService.CloneCompanion(c, comp =>
                        comp.StatusEffects = Updater(comp.StatusEffects ?? new()))
                ).ToList(),
                History = state.History,
                Battle = state.Battle,
                PendingAbilityChoices = state.PendingAbilityChoices
            };
        }

        return new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = state.History,
            Battle = state.Battle is not null
                ? CloneBattle(state.Battle, b =>
                    b.Enemies = b.Enemies.Select(e =>
                        e.Id != targetId ? e : CloneBattleEnemy(e, be =>
                            be.StatusEffects = Updater(be.StatusEffects ?? new()))
                    ).ToList())
                : null,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    private static Companion? FindCompanion(GameState state, string id) =>
        state.Companions.FirstOrDefault(c => c.Id == id);

    private static BattleEnemy? FindEnemy(GameState state, string id) =>
        state.Battle?.Enemies.FirstOrDefault(e => e.Id == id);

    internal static BattleState CloneBattle(BattleState src, Action<BattleState>? mutate = null)
    {
        var b = new BattleState
        {
            Active = src.Active,
            Enemies = new List<BattleEnemy>(src.Enemies),
            Turn = src.Turn,
            Log = new List<string>(src.Log),
            PendingCardRewards = new List<PendingCardReward>(src.PendingCardRewards),
            LastTurnActions = src.LastTurnActions is not null ? new List<EnemyTurnAction>(src.LastTurnActions) : null
        };
        mutate?.Invoke(b);
        return b;
    }

    internal static BattleEnemy CloneBattleEnemy(BattleEnemy src, Action<BattleEnemy>? mutate = null)
    {
        var e = new BattleEnemy
        {
            Id = src.Id,
            DefinitionId = src.DefinitionId,
            Name = src.Name,
            Life = src.Life,
            MaxLife = src.MaxLife,
            Shield = src.Shield,
            Energy = src.Energy,
            MaxEnergy = src.MaxEnergy,
            Element = src.Element,
            Type = src.Type,
            Level = src.Level,
            ExpReward = src.ExpReward,
            Rewards = new List<EnemyReward>(src.Rewards),
            AttackSummaries = src.AttackSummaries is not null ? new List<AttackSummary>(src.AttackSummaries) : null,
            KilledByCompanionId = src.KilledByCompanionId,
            StatusEffects = src.StatusEffects is not null ? new List<StatusEffect>(src.StatusEffects) : null
        };
        mutate?.Invoke(e);
        return e;
    }
}
