import { Request, Response } from 'express';
import { GameLogicService } from '../services/game-logic.service';
import { StateRepository } from '../repo/state-repo';
import { GameState } from '../models/game-state';
import { EventSpawnerService } from '../services/event-spawner.service';

export class GameController {
  private repository = new StateRepository();
  private gameLogic = new GameLogicService();
  private eventSpawner = new EventSpawnerService();

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

  async getEvents(req: Request, res: Response) {
    res.json(this.eventSpawner.getSpecs());
  }

  async validateEvent(req: Request, res: Response) {
    const body = req.body as { eventType: string; count: number };
    const result = this.eventSpawner.validateCount(body.eventType, Number(body.count));
    res.json(result);
  }
}
