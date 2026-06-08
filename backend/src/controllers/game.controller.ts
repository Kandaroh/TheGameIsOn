import { Request, Response } from 'express';
import { GameLogicService } from '../services/game-logic.service';
import { StateRepository } from '../repo/state-repo';
import { GameState } from '../models/game-state';
import { EventSpawnerService } from '../services/event-spawner.service';
import { CompanionService } from '../services/companion.service';
import { BattleService } from '../services/battle.service';
import { DeckService } from '../services/deck.service';
import { Companion } from '../models/companion';
import { Card } from '../models/card';

export class GameController {
  private repository = new StateRepository();
  private gameLogic = new GameLogicService();
  private eventSpawner = new EventSpawnerService();
  private companionService = new CompanionService();
  private battleService = new BattleService();
  private deckService   = new DeckService();

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
    const state = this.gameLogic.createInitialState();
    await this.repository.save(state);
    res.status(201).json(state);
  }

  async getCompanions(req: Request, res: Response) {
    const companions = await this.companionService.getAll();
    res.json(companions);
  }

  async getEvents(req: Request, res: Response) {
    res.json(this.eventSpawner.getSpecs());
  }

    async validateEvent(req: Request, res: Response) {
    const body = req.body as { eventType: string; count: number };
    const result = this.eventSpawner.validateCount(body.eventType, Number(body.count));
    res.json(result);
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
    const updated = this.battleService.endTurn(state);
    await this.repository.save(updated);
    res.json(updated);
  }

  async battleStart(req: Request, res: Response) {
    const state   = await this.repository.load();
    const updated = this.battleService.startBattle(state);
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
    const updated = {
      ...state,
      player:     { ...state.player, deck, hand: [], discard: [] },
      cards,
      companions,
      history: [...state.history, 'Companions finalised � starting deck built'],
    };
    await this.repository.save(updated);
    res.json(updated);
  }

}