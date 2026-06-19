import { Router } from 'express';
import { GameController } from '../controllers/game.controller';

const router = Router();
const controller = new GameController();

router.get('/state', controller.getState.bind(controller));
router.post('/state', controller.saveState.bind(controller));
router.post('/action/move', controller.movePlayer.bind(controller));
router.post('/action/play-card', controller.playCard.bind(controller));
router.post('/action/new-run', controller.resetGame.bind(controller));
router.get('/action/companions', controller.getCompanions.bind(controller));
router.get('/events', controller.getEvents.bind(controller));
router.get('/events/definitions', controller.getEventDefinitions.bind(controller));
router.post('/events/validate', controller.validateEvent.bind(controller));
router.post('/action/battle/play-card', controller.battlePlayCard.bind(controller));
router.post('/action/battle/end-turn', controller.battleEndTurn.bind(controller));
router.post('/action/battle/start', controller.battleStart.bind(controller));
router.post('/action/battle/draw-card', controller.battleDrawCard.bind(controller));
router.post('/action/finalize-companions', controller.finalizeCompanions.bind(controller));
router.post('/action/battle/end',          controller.battleEnd.bind(controller));
router.post('/action/battle/claim-reward', controller.battleClaimReward.bind(controller));
router.post('/action/choose-ability',      controller.chooseAbility.bind(controller));

export { router as gameRouter };
