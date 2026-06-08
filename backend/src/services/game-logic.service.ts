import { GameState } from '../models/game-state';
import { Card } from '../models/card';
import { Deck } from '../models/deck';
import { NodeDefinition } from '../models/node';
import { MapGeneratorService } from './map-generator.service';
import { EventSpawnerService } from './event-spawner.service';

export class GameLogicService {
  private mapGenerator = new MapGeneratorService();
  private eventSpawner = new EventSpawnerService();

  createInitialState(): GameState {
        const cards: Card[] = [
      {
        id: 'strike', name: 'Strike', cost: 1, type: 'attack',
        properties: { damage: 3 },
        effectId: 'fx-strike-normal', enhancedEffectId: 'fx-strike-enhanced',
        effect: { description: 'Deal 3 damage to one enemy.' },
        enhancedEffect: { description: 'Deal 5 damage to one enemy.' },
      },
      {
        id: 'shield', name: 'Shield', cost: 1, type: 'defense',
        properties: { block: 3 },
        effectId: 'fx-shield-normal', enhancedEffectId: 'fx-shield-enhanced',
        effect: { description: 'Gain 2 shield.' },
        enhancedEffect: { description: 'Gain 4 shield.' },
      },
      {
        id: 'focus', name: 'Focus', cost: 2, type: 'utility',
        properties: { manaGain: 2 },
      },
      {
        id: 'bash', name: 'Bash', cost: 2, type: 'attack',
        properties: { damage: 5 },
        effectId: 'fx-strike-enhanced', enhancedEffectId: 'fx-comp-strike-enhanced',
        effect: { description: 'Deal 5 damage to one enemy.' },
        enhancedEffect: { description: 'Deal 6 damage to one enemy.' },
      },
      {
        id: 'heal', name: 'Heal', cost: 1, type: 'defense',
        properties: { recover: 2 },
      },
      {
        id: 'charge', name: 'Charge', cost: 1, type: 'utility',
        properties: { speed: 1 },
      },
    ];

    const graph = this.mapGenerator.generate({ minNodes: 20, maxNodes: 24, minLayers: 5, maxLayers: 7 });
    // enforce event spawn rules on generated nodes
    graph.nodes = this.eventSpawner.assignEvents(graph.nodes);
    const deck: Deck = { cardIds: cards.map(card => card.id) };

    return {
      player: {
        id: 'player-1',
        life: 20,
        mana: 3,
        deck,
        hand: ['strike', 'shield', 'focus'],
        discard: [],
        position: 'start'
      },
      graph,
      cards,
      companions: [],
      history: ['New run created']
    };
  }

  movePlayer(state: GameState, nextNodeId: string): GameState {
    const isForwardMove = state.graph.edges.some(edge => edge.from === state.player.position && edge.to === nextNodeId);
    if (!isForwardMove) {
      return { ...state, history: [...state.history, `invalid move attempted to ${nextNodeId}`] };
    }

    return {
      ...state,
      player: { ...state.player, position: nextNodeId },
      history: [...state.history, `moved to ${nextNodeId}`]
    };
  }

  playCard(state: GameState, cardId: string): GameState {
    const card = state.cards.find(c => c.id === cardId);
    if (!card || !state.player.hand.includes(cardId) || card.cost > state.player.mana) {
      return { ...state, history: [...state.history, `could not play ${cardId}`] };
    }

    const remainingHand = state.player.hand.filter(id => id !== cardId);
    const discard = [...(state.player.discard ?? []), cardId];

    return {
      ...state,
      player: {
        ...state.player,
        mana: state.player.mana - card.cost,
        hand: remainingHand,
        discard
      },
      history: [...state.history, `played ${card.name}`]
    };
  }
}
