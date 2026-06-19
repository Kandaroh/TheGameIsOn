using Microsoft.AspNetCore.Mvc;
using TheGameIsOn.API.Models;
using TheGameIsOn.API.Repositories;
using TheGameIsOn.API.Services;

namespace TheGameIsOn.API.Controllers;

// -------------------------------------------------------------------------
// Request DTOs
// -------------------------------------------------------------------------

public record MoveRequest(string NextNodeId);
public record PlayCardRequest(string CardId);
public record ValidateEventRequest(string EventType, int Count);
public record BattlePlayCardRequest(string CardId, string CompanionId, List<string>? TargetIds);
public record FinalizeCompanionsRequest(List<Companion> Companions);
public record ClaimRewardRequest(string CompanionId, string CardId);
public record ChooseAbilityRequest(string CompanionId, string AbilityId);

// -------------------------------------------------------------------------
// Controller
// -------------------------------------------------------------------------

[ApiController]
[Route("api/game")]
public class GameController : ControllerBase
{
    private readonly IStateRepository _repository;
    private readonly IGameLogicService _gameLogic;
    private readonly IEventSpawnerService _eventSpawner;
    private readonly ICompanionService _companionService;
    private readonly IBattleService _battleService;
    private readonly IDeckService _deckService;
    private readonly IEventRepository _eventRepo;
    private readonly ILevelingService _leveling;
    private readonly IBaseCardRepository _baseCardRepo;

    public GameController(
        IStateRepository repository,
        IGameLogicService gameLogic,
        IEventSpawnerService eventSpawner,
        ICompanionService companionService,
        IBattleService battleService,
        IDeckService deckService,
        IEventRepository eventRepo,
        ILevelingService leveling,
        IBaseCardRepository baseCardRepo)
    {
        _repository = repository;
        _gameLogic = gameLogic;
        _eventSpawner = eventSpawner;
        _companionService = companionService;
        _battleService = battleService;
        _deckService = deckService;
        _eventRepo = eventRepo;
        _leveling = leveling;
        _baseCardRepo = baseCardRepo;
    }

    // GET /api/game/state
    [HttpGet("state")]
    public async Task<IActionResult> GetState()
    {
        var state = await _repository.LoadAsync();
        return Ok(state);
    }

    // POST /api/game/state
    [HttpPost("state")]
    public async Task<IActionResult> SaveState([FromBody] GameState state)
    {
        await _repository.SaveAsync(state);
        return StatusCode(201, new { saved = true });
    }

    // POST /api/game/action/move
    [HttpPost("action/move")]
    public async Task<IActionResult> MovePlayer([FromBody] MoveRequest request)
    {
        var state = await _repository.LoadAsync();
        var updated = _gameLogic.MovePlayer(state, request.NextNodeId);
        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/play-card
    [HttpPost("action/play-card")]
    public async Task<IActionResult> PlayCard([FromBody] PlayCardRequest request)
    {
        var state = await _repository.LoadAsync();
        var updated = _gameLogic.PlayCard(state, request.CardId);
        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/new-run
    [HttpPost("action/new-run")]
    public async Task<IActionResult> ResetGame()
    {
        var state = await _gameLogic.CreateInitialStateAsync();
        await _repository.SaveAsync(state);
        return StatusCode(201, state);
    }

    // GET /api/game/action/companions
    [HttpGet("action/companions")]
    public async Task<IActionResult> GetCompanions()
    {
        var companions = await _companionService.GetAllAsync();
        return Ok(companions);
    }

    // GET /api/game/events
    [HttpGet("events")]
    public async Task<IActionResult> GetEvents()
    {
        var specs = await _eventSpawner.GetSpecsAsync();
        return Ok(specs);
    }

    // GET /api/game/events/definitions
    [HttpGet("events/definitions")]
    public async Task<IActionResult> GetEventDefinitions()
    {
        var defs = await _eventRepo.GetAllAsync();
        return Ok(defs);
    }

    // POST /api/game/events/validate
    [HttpPost("events/validate")]
    public async Task<IActionResult> ValidateEvent([FromBody] ValidateEventRequest request)
    {
        var (valid, reason) = await _eventSpawner.ValidateCountAsync(request.EventType, request.Count);
        return Ok(new { valid, reason });
    }

    // POST /api/game/action/battle/play-card
    [HttpPost("action/battle/play-card")]
    public async Task<IActionResult> BattlePlayCard([FromBody] BattlePlayCardRequest request)
    {
        var state = await _repository.LoadAsync();
        var updated = await _battleService.PlayCard(state, request.CardId, request.CompanionId, request.TargetIds);
        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/battle/end-turn
    [HttpPost("action/battle/end-turn")]
    public async Task<IActionResult> BattleEndTurn()
    {
        var state = await _repository.LoadAsync();
        var updated = await _battleService.EndTurn(state);
        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/battle/start
    [HttpPost("action/battle/start")]
    public async Task<IActionResult> BattleStart()
    {
        var state = await _repository.LoadAsync();
        var updated = await _battleService.StartBattle(state);
        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/battle/draw-card
    [HttpPost("action/battle/draw-card")]
    public async Task<IActionResult> BattleDrawCard()
    {
        var state = await _repository.LoadAsync();
        var drawn = _deckService.DrawCards(state, 1);

        var updated = new GameState
        {
            Player = drawn.Player,
            Graph = drawn.Graph,
            Cards = drawn.Cards,
            Companions = drawn.Companions,
            History = new List<string>(drawn.History) { "drew a card" },
            Battle = drawn.Battle is not null
                ? StatusEffectService.CloneBattle(drawn.Battle, b => b.Log.Add("Player drew 1 card"))
                : null,
            PendingAbilityChoices = drawn.PendingAbilityChoices
        };

        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/finalize-companions
    [HttpPost("action/finalize-companions")]
    public async Task<IActionResult> FinalizeCompanions([FromBody] FinalizeCompanionsRequest request)
    {
        var state = await _repository.LoadAsync();
        var baseCards = await _baseCardRepo.GetAllAsync();
        var (deck, cards) = _deckService.BuildStartingDeck(baseCards, request.Companions);
        var stampedCompanions = request.Companions.Select(c => _leveling.WithNextLevelExp(c)).ToList();

        var updated = new GameState
        {
            Player = state.Player with { Deck = deck, Hand = new(), Discard = new() },
            Graph = state.Graph,
            Cards = cards,
            Companions = stampedCompanions,
            History = new List<string>(state.History) { "Companions finalised — starting deck built" },
            Battle = state.Battle,
            PendingAbilityChoices = state.PendingAbilityChoices
        };

        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/battle/end
    [HttpPost("action/battle/end")]
    public async Task<IActionResult> BattleEnd()
    {
        var state = await _repository.LoadAsync();

        if (state.Battle is null)
            return BadRequest(new { error = "No battle state found." });
        if (state.Battle.Active)
            return BadRequest(new { error = "Battle is still active." });

        await _repository.SaveAsync(state);
        return Ok(state);
    }

    // POST /api/game/action/battle/claim-reward
    [HttpPost("action/battle/claim-reward")]
    public async Task<IActionResult> BattleClaimReward([FromBody] ClaimRewardRequest request)
    {
        var state = await _repository.LoadAsync();

        if (state.Battle is null)
            return BadRequest(new { error = "No battle state found." });
        if (state.Battle.Active)
            return BadRequest(new { error = "Cannot claim rewards while battle is still active." });

        var reward = state.Battle.PendingCardRewards.FirstOrDefault(r => r.CompanionId == request.CompanionId);
        if (reward is null)
            return BadRequest(new { error = $"No pending reward for companion {request.CompanionId}." });

        var chosenCard = reward.CardOptions.FirstOrDefault(c => c.Id == request.CardId);
        if (chosenCard is null)
            return BadRequest(new { error = $"Card {request.CardId} is not a valid reward option." });

        var updatedCards = new List<Card>(state.Cards) { chosenCard };
        var updatedDeck = state.Player.Deck with
        {
            CardIds = new List<string>(state.Player.Deck.CardIds) { chosenCard.Id }
        };
        var remainingRewards = state.Battle.PendingCardRewards
            .Where(r => r.CompanionId != request.CompanionId).ToList();

        var updated = new GameState
        {
            Player = state.Player with { Deck = updatedDeck },
            Graph = state.Graph,
            Cards = updatedCards,
            Companions = state.Companions,
            History = new List<string>(state.History)
            {
                $"{request.CompanionId} claimed reward card: {chosenCard.Name}"
            },
            Battle = StatusEffectService.CloneBattle(state.Battle, b => b.PendingCardRewards = remainingRewards),
            PendingAbilityChoices = state.PendingAbilityChoices
        };

        await _repository.SaveAsync(updated);
        return Ok(updated);
    }

    // POST /api/game/action/choose-ability
    [HttpPost("action/choose-ability")]
    public async Task<IActionResult> ChooseAbility([FromBody] ChooseAbilityRequest request)
    {
        var state = await _repository.LoadAsync();
        var pending = state.PendingAbilityChoices ?? new();
        var choice = pending.FirstOrDefault(c => c.CompanionId == request.CompanionId);

        if (choice is null)
            return BadRequest(new { error = "No pending ability choice for this companion." });

        var ability = choice.Options.FirstOrDefault(a => a.Id == request.AbilityId);
        if (ability is null)
            return BadRequest(new { error = "Invalid ability choice." });

        var updatedCompanions = state.Companions.Select(c =>
            c.Id == request.CompanionId
                ? CardEffectService.CloneCompanion(c, comp =>
                    comp.SpecialAbilities = new List<SpecialAbility>(comp.SpecialAbilities) { ability })
                : c
        ).ToList();

        var remainingChoices = pending.Where(c => c.CompanionId != request.CompanionId).ToList();

        var updated = new GameState
        {
            Player = state.Player,
            Graph = state.Graph,
            Cards = state.Cards,
            Companions = updatedCompanions,
            History = new List<string>(state.History) { $"{choice.CompanionName} learned {ability.Name}" },
            Battle = state.Battle,
            PendingAbilityChoices = remainingChoices
        };

        await _repository.SaveAsync(updated);
        return Ok(updated);
    }
}
