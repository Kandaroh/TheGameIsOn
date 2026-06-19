using TheGameIsOn.API.Models;
using TheGameIsOn.API.Repositories;

namespace TheGameIsOn.API.Services;

public interface IBattleService
{
    Task<GameState> StartBattle(GameState state);
    Task<GameState> PlayCard(GameState state, string cardId, string companionId, List<string>? targetIds = null);
    Task<GameState> EndTurn(GameState state);
}

/// <summary>
/// Resolves all battle-phase actions against the BattleState that lives inside
/// GameState. All methods return a new GameState (no in-place mutations).
/// </summary>
public class BattleService : IBattleService
{
    private readonly ICardEffectRepository _effectRepo;
    private readonly IDeckService _deckService;
    private readonly ICardEffectService _effectService;
    private readonly IEnemyRepository _enemyRepo;
    private readonly IEventRepository _eventRepo;
    private readonly IEnemySpawnerService _enemySpawner;
    private readonly ILevelingService _leveling;
    private readonly ICompanionAbilityService _abilityService;
    private readonly IStatusEffectService _statusService;

    public BattleService(
        ICardEffectRepository effectRepo,
        IDeckService deckService,
        ICardEffectService effectService,
        IEnemyRepository enemyRepo,
        IEventRepository eventRepo,
        IEnemySpawnerService enemySpawner,
        ILevelingService leveling,
        ICompanionAbilityService abilityService,
        IStatusEffectService statusService)
    {
        _effectRepo = effectRepo;
        _deckService = deckService;
        _effectService = effectService;
        _enemyRepo = enemyRepo;
        _eventRepo = eventRepo;
        _enemySpawner = enemySpawner;
        _leveling = leveling;
        _abilityService = abilityService;
        _statusService = statusService;
    }

    // -------------------------------------------------------------------------
    // StartBattle
    // -------------------------------------------------------------------------

    public async Task<GameState> StartBattle(GameState state)
    {
        const int handSize = 5;

        var cleared = CopyState(state, s => s.Player = state.Player with { Hand = new() });
        var withHand = _deckService.DrawCards(cleared, handSize);

        if (withHand.Battle is { Active: true }) return withHand;

        var currentNode = state.Graph.Nodes.FirstOrDefault(n => n.Id == state.Player.Position);
        var nodeEvent = currentNode?.Event;
        var area = nodeEvent?.Area;
        var difficulty = nodeEvent?.Type == "hard battle" ? "hard" : "normal";
        var encounterCount = state.Player.EncounterCount;

        var eventType = nodeEvent?.Type ?? "battle";
        var eventDef = await _eventRepo.GetByTypeAsync(eventType);
        var eventId = eventDef?.Id;

        var enemies = await _enemySpawner.SpawnEnemies(new SpawnContext
        {
            Area = area,
            Difficulty = difficulty,
            EncounterCount = encounterCount,
            EventId = eventId
        });

        var battle = new BattleState
        {
            Active = true,
            Turn = 1,
            Log = new List<string>
            {
                $"Battle started! (area: {area?.ToString()?.ToLowerInvariant() ?? "unknown"}, difficulty: {difficulty}, encounter #{encounterCount + 1})"
            },
            Enemies = enemies,
            PendingCardRewards = new()
        };

        return new GameState
        {
            Player = withHand.Player with { EncounterCount = encounterCount + 1 },
            Graph = withHand.Graph,
            Cards = withHand.Cards,
            Companions = withHand.Companions,
            History = new List<string>(withHand.History)
            {
                $"Battle started — encounter #{encounterCount + 1} ({area?.ToString()?.ToLowerInvariant() ?? "unknown"}, {difficulty})"
            },
            Battle = battle,
            PendingAbilityChoices = withHand.PendingAbilityChoices
        };
    }

    // -------------------------------------------------------------------------
    // PlayCard
    // -------------------------------------------------------------------------

    public async Task<GameState> PlayCard(
        GameState state, string cardId, string companionId, List<string>? targetIds = null)
    {
        var battle = state.Battle;
        if (battle is not { Active: true })
            return AppendHistory(state, "play-card ignored — no active battle");

        var card = state.Cards.FirstOrDefault(c => c.Id == cardId);
        if (card is null || !state.Player.Hand.Contains(cardId))
            return AppendHistory(state, $"play-card failed — card {cardId} not in hand");

        var companion = state.Companions.FirstOrDefault(c => c.Id == companionId);
        if (companion is null)
            return AppendHistory(state, $"play-card failed — companion {companionId} not found");

        var (costDiscount, costLogs) = _abilityService.GetCostReduction(card, companion, state);
        var effectiveCost = Math.Max(0, card.Cost - costDiscount);

        if (effectiveCost > companion.Energy)
            return AppendHistory(state, $"play-card failed — {companion.Name} needs {effectiveCost} energy, has {companion.Energy}");

        // Deduct energy
        var updatedCompanion = CardEffectService.CloneCompanion(companion, c => c.Energy -= effectiveCost);

        // Move card from hand to discard
        var handList = new List<string>(state.Player.Hand);
        var firstIdx = handList.IndexOf(cardId);
        handList.RemoveAt(firstIdx);
        var updatedDiscard = new List<string>(state.Player.Discard) { cardId };

        // Resolve the effect (enhanced if element matches)
        var cardElement = card.Element ?? CardElement.Neutral;
        var companionElement = companion.Element ?? CardElement.Neutral;
        var enhanced = cardElement != CardElement.Neutral && cardElement == companionElement;
        var effectId = enhanced ? (card.EnhancedEffectId ?? card.EffectId) : card.EffectId;
        var effect = effectId is not null ? await _effectRepo.GetByIdAsync(effectId) : null;

        var updatedBattle = StatusEffectService.CloneBattle(battle);
        var updatedCompanions = state.Companions.Select(c =>
            c.Id == companionId ? updatedCompanion : c).ToList();

        if (effect is not null)
        {
            var midState = new GameState
            {
                Player = state.Player with { Hand = handList, Discard = updatedDiscard },
                Graph = state.Graph,
                Cards = state.Cards,
                Companions = updatedCompanions,
                History = state.History,
                Battle = updatedBattle,
                PendingAbilityChoices = state.PendingAbilityChoices
            };

            var resolvedTargets = ResolveTargets(
                effect.Target.ToString()!, targetIds ?? new(), updatedBattle, updatedCompanions);

            var (modifiedEffect, modLogs) = _abilityService.ApplyPassiveModifiers(
                effect, card, updatedCompanion, resolvedTargets, midState);

            var afterEffect = _effectService.Apply(modifiedEffect, updatedCompanion, resolvedTargets, midState);
            updatedBattle = afterEffect.Battle!;
            updatedCompanions = afterEffect.Companions;

            // Post-play bonus effects
            var (bonusEffects, bonusLogs) = _abilityService.GetPostPlayEffects(card, updatedCompanion, afterEffect);
            var bonusState = new GameState
            {
                Player = afterEffect.Player,
                Graph = afterEffect.Graph,
                Cards = afterEffect.Cards,
                Companions = updatedCompanions,
                History = afterEffect.History,
                Battle = updatedBattle,
                PendingAbilityChoices = afterEffect.PendingAbilityChoices
            };

            foreach (var bonus in bonusEffects)
            {
                var comp = bonusState.Companions.FirstOrDefault(c => c.Id == updatedCompanion.Id) ?? updatedCompanion;
                bonusState = _effectService.Apply(bonus, comp, new List<IEffectEntity> { comp }, bonusState);
            }
            updatedBattle = bonusState.Battle!;
            updatedCompanions = bonusState.Companions;

            // Log passive modifier messages
            foreach (var l in costLogs.Concat(modLogs).Concat(bonusLogs))
                updatedBattle.Log.Add(l);

            // Handle apply_status
            if (modifiedEffect.Action == CardEffectAction.ApplyStatus && modifiedEffect.StatusId is not null)
            {
                var statusState = new GameState
                {
                    Player = bonusState.Player,
                    Graph = bonusState.Graph,
                    Cards = bonusState.Cards,
                    Companions = updatedCompanions,
                    History = bonusState.History,
                    Battle = updatedBattle,
                    PendingAbilityChoices = bonusState.PendingAbilityChoices
                };

                statusState = await _statusService.ApplyStatus(
                    resolvedTargets, modifiedEffect.StatusId, modifiedEffect.Value, statusState);
                updatedBattle = statusState.Battle!;
                updatedCompanions = statusState.Companions;
            }
        }

        var effectLabel = effect?.Description ?? $"{card.Name} played (no effect resolved)";
        var enhancedTag = enhanced ? " [enhanced]" : "";
        updatedBattle.Log.Add($"{companion.Name} played {card.Name}{enhancedTag}: {effectLabel}");

        // Mark killed enemies
        updatedBattle.Enemies = updatedBattle.Enemies.Select(e =>
            e.Life <= 0 && e.KilledByCompanionId is null
                ? StatusEffectService.CloneBattleEnemy(e, be => be.KilledByCompanionId = companionId)
                : e
        ).ToList();

        var allEnemiesDead = updatedBattle.Enemies.All(e => e.Life <= 0);
        var resultState = new GameState
        {
            Player = state.Player with { Hand = handList, Discard = updatedDiscard },
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = updatedCompanions,
            History = new List<string>(state.History) { $"{companion.Name} played {card.Name}{enhancedTag}" },
            Battle = updatedBattle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };

        return allEnemiesDead ? CollectRewards(resultState) : resultState;
    }

    // -------------------------------------------------------------------------
    // EndTurn
    // -------------------------------------------------------------------------

    public async Task<GameState> EndTurn(GameState state)
    {
        var battle = state.Battle;
        if (battle is not { Active: true })
            return AppendHistory(state, "end-turn ignored — no active battle");

        // 1. Refill energy
        var refilledCompanions = state.Companions.Select(companion =>
        {
            var max = companion.MaxEnergy ?? companion.Energy + companion.EnergyRefill;
            var refilled = Math.Min(companion.Energy + companion.EnergyRefill, max);
            return CardEffectService.CloneCompanion(companion, c => c.Energy = refilled);
        }).ToList();

        var workingState = new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = refilledCompanions,
            History = state.History,
            Battle = StatusEffectService.CloneBattle(battle, b => b.LastTurnActions = new()),
            PendingAbilityChoices = state.PendingAbilityChoices
        };

        // 1b. Tick turnStart statuses
        var (afterTurnStart, turnStartActions) = await _statusService.TickStatuses(StatusTriggerMoment.TurnStart, workingState);
        workingState = afterTurnStart;

        // 2. Each living enemy takes its turn
        var turnActions = new List<EnemyTurnAction>();

        foreach (var enemy in battle.Enemies)
        {
            if (enemy.Life <= 0) continue;

            var definition = await _enemyRepo.GetByIdAsync(enemy.DefinitionId);
            if (definition is null || definition.Attacks.Count == 0) continue;

            var attack = SelectAttack(definition.Attacks);
            if (attack is null) continue;

            var livingCompanions = workingState.Companions.Where(c => c.Life > 0).ToList();
            if (livingCompanions.Count == 0) break;
            var target = livingCompanions[Random.Shared.Next(livingCompanions.Count)];

            var effect = await _effectRepo.GetByIdAsync(attack.EffectId);
            if (effect is null) continue;

            var targetHpBefore = target.Life;

            if (effect.Action == CardEffectAction.ApplyStatus && effect.StatusId is not null)
            {
                workingState = await _statusService.ApplyStatus(
                    new List<IEffectEntity> { target }, effect.StatusId, effect.Value, workingState);
            }
            else
            {
                workingState = _effectService.Apply(effect, enemy, new List<IEffectEntity> { target }, workingState);
            }

            var updatedTarget = workingState.Companions.FirstOrDefault(c => c.Id == target.Id);
            var targetHpAfter = updatedTarget?.Life ?? 0;
            var damageDealt = targetHpBefore - targetHpAfter;
            var killedTarget = targetHpAfter <= 0;

            turnActions.Add(new EnemyTurnAction
            {
                EnemyId = enemy.Id,
                EnemyName = enemy.Name,
                AttackName = attack.Name,
                TargetId = target.Id,
                TargetName = target.Name,
                DamageDealt = damageDealt,
                KilledTarget = killedTarget
            });

            // Retaliation
            var retaliationDmg = _abilityService.GetRetaliationDamage(target);
            if (retaliationDmg > 0 && !killedTarget)
            {
                var liveEnemy = workingState.Battle!.Enemies.FirstOrDefault(e => e.Id == enemy.Id);
                if (liveEnemy is not null && liveEnemy.Life > 0)
                {
                    var retaliationEffect = new CardEffect
                    {
                        Id = "retaliation",
                        Description = "Retaliation",
                        Action = CardEffectAction.Damage,
                        Value = retaliationDmg,
                        Target = CardEffectTarget.WildMonster
                    };
                    workingState = _effectService.Apply(retaliationEffect, target, new List<IEffectEntity> { liveEnemy }, workingState);
                    workingState.Battle!.Log.Add($"  ⚡ {target.Name} retaliates for {retaliationDmg} damage!");
                }
            }

            workingState.Battle!.Log.Add($"{enemy.Name} used {attack.Name} on {target.Name}.");
        }

        // 2b. Tick turnEnd statuses
        var (afterTurnEnd, turnEndActions) = await _statusService.TickStatuses(StatusTriggerMoment.TurnEnd, workingState);
        workingState = afterTurnEnd;
        turnActions.AddRange(turnStartActions);
        turnActions.AddRange(turnEndActions);

        // 3. Advance turn counter
        var updatedBattle = StatusEffectService.CloneBattle(workingState.Battle!, b =>
        {
            b.Turn = battle.Turn + 1;
            b.LastTurnActions = turnActions;
        });
        workingState = CopyState(workingState, s => s.Battle = updatedBattle);

        // 4. Attribute kills to first living companion
        var firstLivingId = workingState.Companions.FirstOrDefault(c => c.Life > 0)?.Id;
        updatedBattle.Enemies = updatedBattle.Enemies.Select(e =>
            e.Life <= 0 && e.KilledByCompanionId is null && firstLivingId is not null
                ? StatusEffectService.CloneBattleEnemy(e, be => be.KilledByCompanionId = firstLivingId)
                : e
        ).ToList();
        workingState = CopyState(workingState, s => s.Battle = updatedBattle);

        var allDead = updatedBattle.Enemies.All(e => e.Life <= 0);
        if (allDead)
        {
            workingState = CollectRewards(workingState);
        }

        return CopyState(workingState, s =>
            s.History = new List<string>(workingState.History) { $"Turn {battle.Turn} ended — enemies attacked" });
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private static List<IEffectEntity> ResolveTargets(
        string target, List<string> targetIds, BattleState battle, List<Companion> companions)
    {
        var normalized = target.ToLowerInvariant();

        if (normalized == "wildmonster")
        {
            if (targetIds.Count > 0)
                return battle.Enemies.Where(e => targetIds.Contains(e.Id) && e.Life > 0).Cast<IEffectEntity>().ToList();
            var first = battle.Enemies.FirstOrDefault(e => e.Life > 0);
            return first is not null ? new List<IEffectEntity> { first } : new();
        }

        if (normalized == "companion")
        {
            if (targetIds.Count > 0)
                return companions.Where(c => targetIds.Contains(c.Id)).Cast<IEffectEntity>().ToList();
            return companions.Where(c => c.Life > 0).Cast<IEffectEntity>().ToList();
        }

        return new();
    }

    private static EnemyAttack? SelectAttack(List<EnemyAttack> attacks)
    {
        var total = attacks.Sum(a => a.SelectionChance);
        var roll = Random.Shared.NextDouble() * total;
        foreach (var attack in attacks)
        {
            roll -= attack.SelectionChance;
            if (roll <= 0) return attack;
        }
        return attacks.Count > 0 ? attacks[^1] : null;
    }

    private GameState CollectRewards(GameState state)
    {
        var battle = state.Battle!;
        var gold = state.Player.Gold;
        var companions = state.Companions.Select(c => CardEffectService.CloneCompanion(c)).ToList();
        var pendingCardRewards = new List<PendingCardReward>();

        foreach (var enemy in battle.Enemies.Where(e => e.Life <= 0))
        {
            foreach (var reward in enemy.Rewards)
            {
                if (reward.Type == "gold")
                {
                    gold += reward.Value;
                }

                if (reward.Type == "exp")
                {
                    var share = reward.Value / companions.Count;
                    var remainder = reward.Value - share * companions.Count;
                    for (var i = 0; i < companions.Count; i++)
                        companions[i].Exp += share + (i == 0 ? remainder : 0);
                }

                if (reward.Type == "card-draw" && enemy.KilledByCompanionId is not null)
                {
                    var killer = companions.FirstOrDefault(c => c.Id == enemy.KilledByCompanionId);
                    var tier = reward.Tier ?? "common";
                    if (killer is not null)
                    {
                        var pool = tier switch
                        {
                            "uncommon" => new List<Card>(killer.PriceDecks.Uncommon),
                            "rare"     => new List<Card>(killer.PriceDecks.Rare),
                            _          => new List<Card>(killer.PriceDecks.Common)
                        };

                        // Fisher-Yates shuffle
                        for (var i = pool.Count - 1; i > 0; i--)
                        {
                            var j = Random.Shared.Next(i + 1);
                            (pool[i], pool[j]) = (pool[j], pool[i]);
                        }

                        var rewardId = $"{enemy.Id}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
                        var sample = pool.Take(3).Select((c, idx) => c with
                        {
                            Id = $"{c.Id}-reward-{rewardId}-{idx}"
                        }).ToList();

                        if (sample.Count > 0)
                            pendingCardRewards.Add(new PendingCardReward { CompanionId = killer.Id, CardOptions = sample });
                    }
                }
            }
        }

        var (leveledCompanions, allChoices) = _leveling.ProcessAll(companions);

        return new GameState
        {
            Player = state.Player with { Gold = gold },
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = leveledCompanions,
            History = state.History,
            Battle = StatusEffectService.CloneBattle(battle, b =>
            {
                b.Active = false;
                b.PendingCardRewards = pendingCardRewards;
            }),
            PendingAbilityChoices = (state.PendingAbilityChoices ?? new())
                .Concat(allChoices).ToList()
        };
    }

    private static GameState AppendHistory(GameState state, string message)
    {
        return new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = new List<string>(state.History) { message },
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
    }

    private static GameState CopyState(GameState state, Action<GameState> mutate)
    {
        var s = new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = state.Companions,
            History = state.History,
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };
        mutate(s);
        return s;
    }
}
