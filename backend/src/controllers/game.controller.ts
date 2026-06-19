import { Request, Response } from 'express';
import { GameLogicService } from '../services/game-logic.service';
import { StateRepository } from '../repo/state-repo';
import { GameState, PendingAbilityChoice } from '../models/game-state';
import { EventSpawnerService } from '../services/event-spawner.service';
import { EventRepository } from '../repo/event-repo';
import { CompanionService } from '../services/companion.service';
import { BattleService } from '../services/battle.service';
import { DeckService } from '../services/deck.service';
import { Companion } from '../models/companion';
import { Card } from '../models/card';
import { LevelingService } from '../services/leveling.service';

export class GameController {
  private repository = new StateRepository();
  private gameLogic = new GameLogicService();
  private eventSpawner = new EventSpawnerService();
  private companionService = new CompanionService();
    private battleService = new BattleService();
  private deckService   = new DeckService();
  private eventRepo     = new EventRepository();
  private leveling      = new LevelingService();

  async getState(req: Request, res: Response) {
    const state = await this.repository.load();
    res.json(state);
  }

  async saveState(req: Request, res: Response) {
    const state = req.body as GameState;
    await this.repository.save(state);
    res.status(201).json({ saved: true });
  }

  async movePlayer(req: Request, res: Response) {
    const state = await this.repository.load();
    const nextNodeId = String(req.body.nextNodeId);
    const updated = this.gameLogic.movePlayer(state, nextNodeId);
    await this.repository.save(updated);
    res.json(updated);
  }

  async playCard(req: Request, res: Response) {
    const state = await this.repository.load();
    const cardId = String(req.body.cardId);
    const updated = this.gameLogic.playCard(state, cardId);
    await this.repository.save(updated);
    res.json(updated);
  }

    async resetGame(req: Request, res: Response) {
    const state = await this.gameLogic.createInitialState();
    await this.repository.save(state);
    res.status(201).json(state);
  }

  async getCompanions(req: Request, res: Response) {
    const companions = await this.companionService.getAll();
    res.json(companions);
  }

    async getEvents(req: Request, res: Response) {
    const specs = await this.eventSpawner.getSpecs();
    res.json(specs);
  }

  async validateEvent(req: Request, res: Response) {
    const body = req.body as { eventType: string; count: number };
    const result = await this.eventSpawner.validateCount(body.eventType, Number(body.count));
    res.json(result);
  }

  async getEventDefinitions(req: Request, res: Response) {
    const defs = await this.eventRepo.getAll();
    res.json(defs);
  }

  async battlePlayCard(req: Request, res: Response) {
    const state = await this.repository.load();
    const { cardId, companionId, targetIds } = req.body as {
      cardId: string;
      companionId: string;
      targetIds?: string[];
    };
    const updated = await this.battleService.playCard(
      state,
      String(cardId),
      String(companionId),
      targetIds
    );
    await this.repository.save(updated);
    res.json(updated);
  }

  async battleEndTurn(req: Request, res: Response) {
    const state = await this.repository.load();
    const updated = await this.battleService.endTurn(state);
    await this.repository.save(updated);
    res.json(updated);
  }

  async battleStart(req: Request, res: Response) {
    const state   = await this.repository.load();
    const updated = await this.battleService.startBattle(state);
    await this.repository.save(updated);
    res.json(updated);
  }

  async battleDrawCard(req: Request, res: Response) {
    const state    = await this.repository.load();
    const drawn    = this.deckService.drawCards(state, 1);
    const updated  = {
      ...drawn,
      battle: drawn.battle
        ? { ...drawn.battle, log: [...drawn.battle.log, 'Player drew 1 card'] }
        : drawn.battle,
      history: [...drawn.history, 'drew a card'],
    };
    await this.repository.save(updated);
    res.json(updated);
  }

    async finalizeCompanions(req: Request, res: Response) {
    const state = await this.repository.load();
    const { companions, baseCards } = req.body as {
      companions: Companion[];
      baseCards:  Card[];
    };
    const { deck, cards } = this.deckService.buildStartingDeck(baseCards, companions);
        // Stamp nextLevelExp on each companion so the frontend never needs the formula.
    const stampedCompanions = companions.map(c => this.leveling.withNextLevelExp(c));
    const updated = {
      ...state,
      player:     { ...state.player, deck, hand: [], discard: [] },
      cards,
      companions: stampedCompanions,
      history: [...state.history, 'Companions finalised — starting deck built'],
    };
    await this.repository.save(updated);
    res.json(updated);
  }

  async battleEnd(req: Request, res: Response) {
    const state = await this.repository.load();

    if (!state.battle) {
      res.status(400).json({ error: 'No battle state found.' });
      return;
    }
    if (state.battle.active) {
      res.status(400).json({ error: 'Battle is still active.' });
      return;
    }

    // Battle already ended (collectRewards set active: false).
    // Persist as-is and return so the frontend can proceed.
    await this.repository.save(state);
    res.json(state);
  }

  async chooseAbility(req: Request, res: Response) {
    const state = await this.repository.load();
    const { companionId, abilityId } = req.body as { companionId: string; abilityId: string };

    const pending = state.pendingAbilityChoices ?? [];
    const choice  = pending.find(c => c.companionId === companionId);
    if (!choice) {
      res.status(400).json({ error: 'No pending ability choice for this companion.' });
      return;
    }

    const ability = choice.options.find(a => a.id === abilityId);
    if (!ability) {
      res.status(400).json({ error: 'Invalid ability choice.' });
      return;
    }

    const updatedCompanions = state.companions.map(c =>
      c.id === companionId
        ? { ...c, specialAbilities: [...(c.specialAbilities ?? []), ability] }
        : c
    );

    const remainingChoices = pending.filter(c => c.companionId !== companionId);

    const updated: GameState = {
      ...state,
      companions: updatedCompanions,
      pendingAbilityChoices: remainingChoices,
      history: [...state.history, `${choice.companionName} learned ${ability.name}`],
    };

    await this.repository.save(updated);
    res.json(updated);
  }

  async battleClaimReward(req: Request, res: Response) {
    const state = await this.repository.load();
    const { companionId, cardId } = req.body as {
      companionId: string;
      cardId: string;
    };

        if (!state.battle) {
      res.status(400).json({ error: 'No battle state found.' });
      return;
    }

    if (state.battle.active) {
      res.status(400).json({ error: 'Cannot claim rewards while battle is still active.' });
      return;
    }

    const reward = state.battle.pendingCardRewards.find(
      r => r.companionId === companionId
    );
    if (!reward) {
      res.status(400).json({ error: `No pending reward for companion ${companionId}.` });
      return;
    }

    const chosenCard = reward.cardOptions.find(c => c.id === cardId);
    if (!chosenCard) {
      res.status(400).json({ error: `Card ${cardId} is not a valid reward option.` });
      return;
    }

    // 1. Add the chosen card to the master card catalogue.
    //    Reward card IDs are stamped with a unique suffix at reward-generation
    //    time, so a plain push is always safe — no deduplication needed.
    const updatedCards = [...state.cards, chosenCard];

    // 2. Add card id to the player's deck.
    const updatedDeck = {
      ...state.player.deck,
      cardIds: [...state.player.deck.cardIds, chosenCard.id],
    };

    // 3. Remove this reward from pendingCardRewards.
    const remainingRewards = state.battle.pendingCardRewards.filter(
      r => r.companionId !== companionId
    );

    const updated: GameState = {
      ...state,
      cards:  updatedCards,
      player: { ...state.player, deck: updatedDeck },
      battle: { ...state.battle, pendingCardRewards: remainingRewards },
      history: [
        ...state.history,
        `${companionId} claimed reward card: ${chosenCard.name}`,
      ],
    };

    await this.repository.save(updated);
    res.json(updated);
  }

}