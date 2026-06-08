# Data Models

All interfaces live in `backend/src/models/`.

## GameState
```ts
interface GameState {
  player: Player;
  graph: Graph;
  cards: Card[];        // master card catalogue for this run
  companions: Companion[];
  history: string[];    // log of moves/actions
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

## Initial card catalogue (new run)
| id | name | cost | type | key property |
|----|------|------|------|--------------|
| strike | Strike | 1 | attack | damage:3 |
| shield | Shield | 1 | defense | block:3 |
| focus | Focus | 2 | utility | manaGain:2 |
| bash | Bash | 2 | attack | damage:5 |
| heal | Heal | 1 | defense | recover:2 |
| charge | Charge | 1 | utility | speed:1 |
