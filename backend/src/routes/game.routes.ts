import { Router } from 'express';
import { GameController } from '../controllers/game.controller';

const router = Router();
const controller = new GameController();

router.get('/state', controller.getState.bind(controller));
router.post('/state', controller.saveState.bind(controller));
router.post('/action/move', controller.movePlayer.bind(controller));
router.post('/action/play-card', controller.playCard.bind(controller));
router.post('/action/new-run', controller.resetGame.bind(controller));
router.get('/events', controller.getEvents.bind(controller));
router.post('/events/validate', controller.validateEvent.bind(controller));

export { router as gameRouter };
