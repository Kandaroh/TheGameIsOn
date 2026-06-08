# Data Models

All interfaces live in `backend/src/models/`. Frontend mirrors are in `frontend/src/app/shared/models/`.

## GameState
```ts
interface GameState {
  player: Player;
  graph: Graph;
  cards: Card[];          // master card catalogue for this run
  companions: Companion[];
  history: string[];      // log of moves/actions (global)
  battle?: BattleState;   // present only while a battle encounter is active
}
```

## Player
```ts
interface Player {
  id: string;
  life: number;
  mana: number;
  deck: Deck;           // { cardIds: string[] }
  hand: string[];       // card ids currently in hand
  discard: string[];    // card ids in discard pile
  position: string;     // current node id
}
```

## Graph / Map
```ts
interface Graph {
  nodes: NodeDefinition[];
  edges: Array<{ from: string; to: string }>;  // directed, forward-only
}

interface NodeDefinition {
  id: string;
  title: string;
  icon?: string;
  layout?: { x: number; y: number }; // 0-100 percentage coords
  event: NodeEvent;
}

interface NodeEvent {
  type: NodeEventType | string;
  payload?: Record<string, unknown>;
}

type NodeEventType =
  | 'battle' | 'treasure' | 'rest'
  | 'hard battle' | 'new object' | 'power up'
  | 'start' | 'end';
```

## Card
```ts
type CardTarget = 'companion' | 'wildMonster' | 'deck' | 'discard';
type CardTargetNumber = 1 | 2 | 'ALL';
type CardElement = 'fire'|'water'|'earth'|'air'|'arcane'|'shadow'|'light'|'neutral';

interface CardEffectRef {
  description: string; // display text shown on card face
}

interface Card {
  id: string;
  name: string;
  cost: number;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  description?: string;
  sprite?: string;
  target?: CardTarget;
  targetNumber?: CardTargetNumber;
  properties?: Record<string, unknown>; // e.g. { damage:3 }, { block:4 }
  effectId?: string;          // key into card-effects.json for normal play
  enhancedEffectId?: string;  // key into card-effects.json for type-match bonus
  effect?: CardEffectRef;     // inline display text (mirrors CardEffect.description)
  enhancedEffect?: CardEffectRef;
}
```

## Companion
```ts
interface Companion {
  id: string;
  name: string;
  type: 'attack' | 'defense' | 'utility';
  element?: CardElement;
  life: number;
  maxLife?: number;
  energy: number;
  maxEnergy?: number;
  energyRefill: number;
  sprite?: string;
  priceDecks: {
    common: Card[];
    uncommon: Card[];
    rare: Card[];
  };
}
```

## Deck
```ts
interface Deck {
  cardIds: string[];
}
```

## BattleState
```ts
interface Enemy {
  id: string;
  name: string;
  life: number;
  maxLife: number;
  shield: number;   // absorbs damage before life
  energy: number;
  maxEnergy: number;
  element?: string;
  type?: string;    // display label e.g. 'Beast', 'Construct'
}

interface BattleState {
  active: boolean;  // false once battle is resolved (reserved for future use)
  enemies: Enemy[];
  turn: number;     // incremented by BattleService.endTurn()
  log: string[];    // per-battle narrative, newest entries last
}
```

`BattleState` is nested inside `GameState.battle` and is persisted alongside all other state.

## CardEffect
```ts
type CardEffectAction = 'damage' | 'shield' | 'evade' | 'evade_draw' | 'heal' | 'draw';
type CardEffectTarget = 'wildMonster' | 'companion' | 'deck' | 'discard';

interface CardEffect {
  id: string;               // e.g. 'fx-strike-normal'
  description: string;      // human-readable summary
  action: CardEffectAction; // what the effect does
  value: number;            // magnitude (damage dealt, shield gained, …)
  target: CardEffectTarget; // who the effect applies to
}
```

Defined in `backend/backend-data/card-effects.json` and loaded by `CardEffectRepository`.

## Initial card catalogue (new run)
| id | name | cost | type | effectId | enhancedEffectId |
|----|------|------|------|----------|------------------|
| strike | Strike | 1 | attack | fx-strike-normal | fx-strike-enhanced |
| shield | Shield | 1 | defense | fx-shield-normal | fx-shield-enhanced |
| focus | Focus | 2 | utility | — | — |
| bash | Bash | 2 | attack | fx-strike-enhanced | fx-comp-strike-enhanced |
| heal | Heal | 1 | defense | — | — |
| charge | Charge | 1 | utility | — | — |

Additional cards are added to the catalogue when companions are selected (see `DeckService.buildStartingDeck()`).
